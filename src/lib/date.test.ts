import { describe, expect, it } from "vitest";
import { addDays, currentMonthIST, daysBetween, eachDay, formatDate, isValidDate, monthRange, todayIST } from "./date";

describe("todayIST", () => {
  it("rolls over at 18:30 UTC (00:00 IST)", () => {
    expect(todayIST(new Date("2026-11-25T18:29:59Z"))).toBe("2026-11-25");
    expect(todayIST(new Date("2026-11-25T18:30:00Z"))).toBe("2026-11-26");
  });
  it("is 8 AM IST at 02:30 UTC (cron time)", () => {
    expect(todayIST(new Date("2026-11-26T02:30:00Z"))).toBe("2026-11-26");
  });
  it("handles month and year boundaries", () => {
    expect(todayIST(new Date("2026-12-31T19:00:00Z"))).toBe("2027-01-01");
    expect(currentMonthIST(new Date("2026-12-31T19:00:00Z"))).toBe("2027-01");
  });
});

describe("calendar arithmetic", () => {
  it("adds days across months and leap years", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("computes day differences", () => {
    expect(daysBetween("2026-11-01", "2026-11-26")).toBe(25);
    expect(daysBetween("2026-11-26", "2026-11-26")).toBe(0);
  });
  it("returns month ranges", () => {
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });
  it("lists days inclusively", () => {
    expect(eachDay("2026-11-29", "2026-12-02")).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
  });
  it("validates dates strictly", () => {
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-2-3")).toBe(false);
    expect(isValidDate("2026-02-28")).toBe(true);
  });
  it("formats date-only values without timezone shifts", () => {
    expect(formatDate("2026-11-26")).toBe("26 Nov 2026");
  });
});
