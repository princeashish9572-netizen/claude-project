import { describe, expect, it } from "vitest";
import { neutralizeFormula, toCsv } from "./export";
import { amountInWords, numberToIndianWords } from "./words";
import { formatINR, sumMoney } from "./format";
import { paymentSchema, safeRedirectPath, sanitizeSearch, studentSchema } from "./validation";

describe("export", () => {
  it("neutralises spreadsheet formulas but keeps phone numbers", () => {
    expect(neutralizeFormula("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(neutralizeFormula("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(neutralizeFormula("-1+1")).toBe("'-1+1");
    expect(neutralizeFormula("+919876543210")).toBe("+919876543210");
    expect(neutralizeFormula(-5)).toBe(-5);
  });
  it("quotes CSV fields and adds a BOM", () => {
    const csv = toCsv({ name: "x", columns: [{ header: "A" }, { header: "B" }], rows: [["a,b", 'say "hi"'], [null, 3]] });
    expect(csv).toBe('﻿A,B\r\n"a,b","say ""hi"""\r\n,3\r\n');
  });
});

describe("money", () => {
  it("formats INR with Indian grouping", () => {
    expect(formatINR(1234567.5)).toBe("₹12,34,567.5");
    expect(formatINR("2500")).toBe("₹2,500");
  });
  it("sums without float drift", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });
  it("spells amounts in Indian words", () => {
    expect(numberToIndianWords(12_34_567)).toBe("Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven");
    expect(amountInWords(2500.5)).toBe("Rupees Two Thousand Five Hundred and Fifty Paise Only");
    expect(amountInWords(1_00_00_000)).toBe("Rupees One Crore Only");
  });
});

describe("validation", () => {
  const base = {
    name: " Ravi ",
    phone: "98765 43210",
    course: "JEE",
    admission_date: "2026-11-01",
    fee_amount: "2500",
    billing_cycle: "monthly",
    schedule_start_date: "2026-11-05",
  };
  it("accepts and normalises a valid student", () => {
    const r = studentSchema.parse({ ...base, cycle_interval_months: "3", email: "", end_date: "" });
    expect(r).toMatchObject({ name: "Ravi", phone: "9876543210", fee_amount: 2500, email: null, end_date: null, cycle_interval_months: null });
  });
  it("requires an interval for custom cycles", () => {
    const r = studentSchema.safeParse({ ...base, billing_cycle: "custom" });
    expect(r.success).toBe(false);
  });
  it("rejects bad money and phones", () => {
    expect(studentSchema.safeParse({ ...base, fee_amount: "12.345" }).success).toBe(false);
    expect(studentSchema.safeParse({ ...base, fee_amount: "0" }).success).toBe(false);
    expect(studentSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
  });
  it("rejects an end date before the due date", () => {
    expect(studentSchema.safeParse({ ...base, end_date: "2026-11-01" }).success).toBe(false);
  });
  it("validates payments", () => {
    const ok = paymentSchema.safeParse({ student_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7", amount: "100.50", paid_on: "2026-11-26", method: "upi", due_id: "" });
    expect(ok.success && ok.data.amount).toBe(100.5);
    expect(paymentSchema.safeParse({ student_id: "x", amount: "1", paid_on: "2026-11-26", method: "upi" }).success).toBe(false);
  });
  it("only allows same-site redirects", () => {
    expect(safeRedirectPath("/students?x=1")).toBe("/students?x=1");
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
  });
  it("strips PostgREST filter syntax from search", () => {
    expect(sanitizeSearch("ravi),phone.eq.(1")).toBe("ravi phone.eq. 1");
    expect(sanitizeSearch("  Ravi   Kumar ")).toBe("Ravi Kumar");
  });
});
