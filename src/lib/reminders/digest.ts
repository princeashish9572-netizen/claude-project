import { daysBetween, formatDate, formatLongDate } from "@/lib/date";
import { formatINR, formatPhone, sumMoney, toNumber } from "@/lib/format";

/** Minimal due shape the digest needs (subset of due_details). */
export interface DigestDue {
  student_id: string;
  student_name: string;
  student_phone: string;
  course: string;
  due_date: string;
  balance: number | string;
}

export interface DigestStudentLine {
  studentId: string;
  name: string;
  phone: string;
  course: string;
  amount: number;
  dueDate: string; // due date (today) or oldest overdue date
  dueCount: number;
  daysOverdue: number;
}

export interface Digest {
  today: string;
  dueToday: DigestStudentLine[];
  overdue: DigestStudentLine[];
  dueTodayTotal: number;
  overdueTotal: number;
  totalExpected: number;
  chunks: string[];
  text: string;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function group(dues: DigestDue[], today: string): DigestStudentLine[] {
  const map = new Map<string, DigestStudentLine & { paise: number }>();
  for (const d of dues) {
    const paise = Math.round(toNumber(d.balance) * 100);
    if (paise <= 0) continue;
    const existing = map.get(d.student_id);
    if (existing) {
      existing.paise += paise;
      existing.dueCount += 1;
      if (d.due_date < existing.dueDate) existing.dueDate = d.due_date;
    } else {
      map.set(d.student_id, {
        studentId: d.student_id,
        name: d.student_name,
        phone: d.student_phone,
        course: d.course,
        amount: 0,
        paise,
        dueDate: d.due_date,
        dueCount: 1,
        daysOverdue: 0,
      });
    }
  }
  return [...map.values()].map(({ paise, ...line }) => ({
    ...line,
    amount: paise / 100,
    daysOverdue: Math.max(0, daysBetween(line.dueDate, today)),
  }));
}

/** Split lines into Telegram-sized messages without breaking an entry. */
export function chunkMessage(blocks: string[], limit = 3900): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const block of blocks) {
    const piece = block.length > limit ? block.slice(0, limit - 1) + "…" : block;
    const candidate = current ? `${current}\n${piece}` : piece;
    if (candidate.length > limit && current) {
      chunks.push(current);
      current = piece;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Builds the admin's daily Telegram digest from open dues (balance > 0,
 * due_date <= today) of active students. `today` must be the IST date.
 */
export function buildDailyDigest(
  dues: DigestDue[],
  today: string,
  opts: { instituteName: string; appUrl?: string },
): Digest {
  const dueToday = group(
    dues.filter((d) => d.due_date === today),
    today,
  ).sort((a, b) => a.name.localeCompare(b.name));
  const overdue = group(
    dues.filter((d) => d.due_date < today),
    today,
  ).sort((a, b) => b.daysOverdue - a.daysOverdue || a.name.localeCompare(b.name));

  const dueTodayTotal = sumMoney(dueToday.map((l) => l.amount));
  const overdueTotal = sumMoney(overdue.map((l) => l.amount));
  const totalExpected = sumMoney([dueTodayTotal, overdueTotal]);

  const blocks: string[] = [];
  blocks.push(
    `📅 <b>Daily Fee Reminder — ${escapeHtml(opts.instituteName)}</b>\n<i>${escapeHtml(formatLongDate(today))} (IST)</i>\n`,
  );

  if (dueToday.length === 0 && overdue.length === 0) {
    blocks.push("✅ No fees are due today and there are no overdue payments.");
  }

  if (dueToday.length > 0) {
    blocks.push(`🔔 <b>Due today — ${dueToday.length} student${dueToday.length === 1 ? "" : "s"}</b>`);
    dueToday.forEach((l, i) => {
      blocks.push(
        `${i + 1}. <b>${escapeHtml(l.name)}</b> · ${escapeHtml(l.course)}\n` +
          `    💰 ${formatINR(l.amount)} · Due ${formatDate(l.dueDate)}\n` +
          `    📞 ${escapeHtml(formatPhone(l.phone))}`,
      );
    });
    blocks.push(`<b>Subtotal due today: ${formatINR(dueTodayTotal)}</b>\n`);
  }

  if (overdue.length > 0) {
    blocks.push(`⚠️ <b>Overdue — ${overdue.length} student${overdue.length === 1 ? "" : "s"}</b>`);
    overdue.forEach((l, i) => {
      const since =
        l.dueCount > 1 ? `${l.dueCount} dues, oldest ${formatDate(l.dueDate)}` : `Due ${formatDate(l.dueDate)}`;
      blocks.push(
        `${i + 1}. <b>${escapeHtml(l.name)}</b> · ${escapeHtml(l.course)}\n` +
          `    💰 ${formatINR(l.amount)} · ${since} (${l.daysOverdue} day${l.daysOverdue === 1 ? "" : "s"} late)\n` +
          `    📞 ${escapeHtml(formatPhone(l.phone))}`,
      );
    });
    blocks.push(`<b>Subtotal overdue: ${formatINR(overdueTotal)}</b>\n`);
  }

  blocks.push(
    `📊 <b>Summary</b>\n` +
      `Due today: ${formatINR(dueTodayTotal)} (${dueToday.length})\n` +
      `Overdue: ${formatINR(overdueTotal)} (${overdue.length})\n` +
      `<b>Total expected collection: ${formatINR(totalExpected)}</b>`,
  );
  if (opts.appUrl) blocks.push(`\n🔗 ${escapeHtml(opts.appUrl.replace(/\/$/, ""))}/dashboard`);

  const chunks = chunkMessage(blocks);
  return {
    today,
    dueToday,
    overdue,
    dueTodayTotal,
    overdueTotal,
    totalExpected,
    chunks,
    text: chunks.join("\n"),
  };
}

/** Plain-text rendering of a Telegram HTML message (for previews in the UI). */
export function telegramHtmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
