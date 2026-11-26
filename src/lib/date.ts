/**
 * Date helpers. Every calendar computation in the app is done in
 * Asia/Kolkata (IST, UTC+05:30, no DST). Calendar dates are represented as
 * "YYYY-MM-DD" strings and manipulated with UTC arithmetic so the server's own
 * timezone (UTC on Vercel) never leaks in.
 */
export const APP_TIMEZONE = "Asia/Kolkata";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's calendar date in IST, e.g. "2026-11-26". */
export function todayIST(now: Date = new Date()): string {
  return ymdFormatter.format(now);
}

/** Current month in IST, e.g. "2026-11". */
export function currentMonthIST(now: Date = new Date()): string {
  return todayIST(now).slice(0, 7);
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

export function isValidMonth(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = MONTH_RE.exec(value);
  return !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12;
}

function toUTC(date: string): Date {
  if (!isValidDate(date)) throw new Error(`Invalid date: ${date}`);
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTC(d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);
}

export function monthRange(month: string): { from: string; to: string } {
  if (!isValidMonth(month)) throw new Error(`Invalid month: ${month}`);
  const [y, m] = month.split("-").map(Number) as [number, number];
  const from = fromUTC(new Date(Date.UTC(y, m - 1, 1)));
  const to = fromUTC(new Date(Date.UTC(y, m, 0)));
  return { from, to };
}

/** Inclusive list of dates from..to. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const n = daysBetween(from, to);
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

const displayDate = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const displayWeekday = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  weekday: "long",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const displayMonth = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
const displayDateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/** "26 Nov 2026" */
export function formatDate(date: string | null | undefined): string {
  if (!date || !isValidDate(date)) return "—";
  return displayDate.format(toUTC(date));
}

/** "Thursday, 26 Nov 2026" */
export function formatLongDate(date: string): string {
  return displayWeekday.format(toUTC(date));
}

/** "November 2026" */
export function formatMonth(month: string): string {
  return displayMonth.format(toUTC(`${month}-01`));
}

/** Timestamp rendered in IST: "26 Nov 2026, 08:00 am" */
export function formatDateTime(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? "—" : displayDateTime.format(d);
}
