import { describe, expect, it } from "vitest";
import { buildDailyDigest, chunkMessage, escapeHtml, telegramHtmlToText, type DigestDue } from "./digest";

const due = (over: Partial<DigestDue>): DigestDue => ({
  student_id: "s1",
  student_name: "Ravi Kumar",
  student_phone: "9876543210",
  course: "JEE",
  due_date: "2026-11-26",
  balance: 1000,
  ...over,
});

describe("buildDailyDigest", () => {
  const today = "2026-11-26";

  it("separates due-today and overdue, groups by student, totals correctly", () => {
    const d = buildDailyDigest(
      [
        due({ student_id: "a", student_name: "Anita", balance: "2500.50" }),
        due({ student_id: "b", student_name: "Bharat", due_date: "2026-10-26", balance: 1000 }),
        due({ student_id: "b", student_name: "Bharat", due_date: "2026-09-26", balance: 1000 }),
        due({ student_id: "c", student_name: "Chitra", due_date: "2026-11-25", balance: 0.1 }),
        due({ student_id: "c", student_name: "Chitra", due_date: "2026-11-24", balance: 0.2 }),
        due({ student_id: "z", student_name: "Zero", balance: 0 }),
      ],
      today,
      { instituteName: "Test Institute" },
    );
    expect(d.dueToday.map((l) => l.name)).toEqual(["Anita"]);
    expect(d.overdue.map((l) => l.name)).toEqual(["Bharat", "Chitra"]); // most days late first
    expect(d.overdue[0]).toMatchObject({ amount: 2000, dueCount: 2, dueDate: "2026-09-26", daysOverdue: 61 });
    expect(d.overdue[1]!.amount).toBe(0.3); // no float drift
    expect(d.dueTodayTotal).toBe(2500.5);
    expect(d.overdueTotal).toBe(2000.3);
    expect(d.totalExpected).toBe(4500.8);
    expect(d.text).toContain("Total expected collection");
    expect(d.text).toContain("Anita");
    expect(d.text).not.toContain("Zero");
  });

  it("sends an all-clear message when nothing is due", () => {
    const d = buildDailyDigest([], today, { instituteName: "X" });
    expect(d.text).toContain("No fees are due today");
    expect(d.totalExpected).toBe(0);
  });

  it("escapes HTML in names to keep Telegram parse_mode safe", () => {
    const d = buildDailyDigest([due({ student_name: "<b>Evil</b> & Co" })], today, { instituteName: "A&B <Academy>" });
    expect(d.text).toContain("&lt;b&gt;Evil&lt;/b&gt; &amp; Co");
    expect(d.text).toContain("A&amp;B &lt;Academy&gt;");
    expect(d.text).not.toContain("<b>Evil");
  });

  it("splits long digests into Telegram-sized chunks", () => {
    const dues = Array.from({ length: 300 }, (_, i) =>
      due({ student_id: `s${i}`, student_name: `Student number ${i}`, due_date: "2026-11-01" }),
    );
    const d = buildDailyDigest(dues, today, { instituteName: "X" });
    expect(d.chunks.length).toBeGreaterThan(1);
    for (const c of d.chunks) expect(c.length).toBeLessThanOrEqual(3900);
    expect(d.overdue).toHaveLength(300);
  });
});

describe("helpers", () => {
  it("chunkMessage keeps blocks intact", () => {
    expect(chunkMessage(["aaa", "bbb", "ccc"], 7)).toEqual(["aaa\nbbb", "ccc"]);
  });
  it("round-trips escaping for previews", () => {
    expect(telegramHtmlToText(`<b>${escapeHtml("A & <B>")}</b>`)).toBe("A & <B>");
  });
});
