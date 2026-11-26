import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, currentMonthIST, eachDay, isValidDate, isValidMonth, monthRange, todayIST, formatDate, formatMonth } from "@/lib/date";
import { sumMoney, toNumber } from "@/lib/format";
import type { PaymentMethod, PaymentWithStudent } from "@/lib/types";
import { fetchAll } from "./fetch-all";

export type ReportType = "daily" | "monthly" | "range";

export interface ReportPeriod {
  type: ReportType;
  from: string;
  to: string;
  label: string;
  /** Normalised query params for links (export buttons etc.) */
  params: Record<string, string>;
}

const MAX_RANGE_DAYS = 366;

export function parseReportPeriod(sp: Record<string, string | string[] | undefined>): ReportPeriod {
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const today = todayIST();
  const type = (["daily", "monthly", "range"] as const).find((t) => t === one("type")) ?? "monthly";

  if (type === "daily") {
    const date = isValidDate(one("date")) && one("date")! <= today ? one("date")! : today;
    return { type, from: date, to: date, label: formatDate(date), params: { type, date } };
  }
  if (type === "range") {
    let from = isValidDate(one("from")) ? one("from")! : addDays(today, -29);
    let to = isValidDate(one("to")) ? one("to")! : today;
    if (from > to) [from, to] = [to, from];
    if (eachDay(from, to).length > MAX_RANGE_DAYS) from = addDays(to, -(MAX_RANGE_DAYS - 1));
    return { type, from, to, label: `${formatDate(from)} – ${formatDate(to)}`, params: { type, from, to } };
  }
  const month = isValidMonth(one("month")) ? one("month")! : currentMonthIST();
  const { from, to } = monthRange(month);
  return { type, from, to, label: formatMonth(month), params: { type, month } };
}

export interface CollectionReport {
  period: ReportPeriod;
  payments: PaymentWithStudent[];
  total: number;
  count: number;
  byMethod: { method: PaymentMethod; total: number; count: number }[];
  byCourse: { course: string; total: number; count: number }[];
  byDay: { date: string; total: number; count: number }[];
}

export async function getCollectionReport(supabase: SupabaseClient, period: ReportPeriod): Promise<CollectionReport> {
  const payments = await fetchAll<PaymentWithStudent>((from, to) =>
    supabase
      .from("payments")
      .select("*, students(name, phone, course)")
      .is("voided_at", null)
      .gte("paid_on", period.from)
      .lte("paid_on", period.to)
      .order("paid_on", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, to),
  );

  const groupBy = <K extends string>(key: (p: PaymentWithStudent) => K) => {
    const m = new Map<K, { paise: number; count: number }>();
    for (const p of payments) {
      const k = key(p);
      const g = m.get(k) ?? { paise: 0, count: 0 };
      g.paise += Math.round(toNumber(p.amount) * 100);
      g.count += 1;
      m.set(k, g);
    }
    return m;
  };

  const methods = groupBy((p) => p.method);
  const courses = groupBy((p) => p.students?.course ?? "—");
  const days = groupBy((p) => p.paid_on);

  return {
    period,
    payments,
    total: sumMoney(payments.map((p) => p.amount)),
    count: payments.length,
    byMethod: [...methods.entries()]
      .map(([method, g]) => ({ method, total: g.paise / 100, count: g.count }))
      .sort((a, b) => b.total - a.total),
    byCourse: [...courses.entries()]
      .map(([course, g]) => ({ course, total: g.paise / 100, count: g.count }))
      .sort((a, b) => b.total - a.total),
    byDay:
      period.from === period.to
        ? []
        : eachDay(period.from, period.to).map((date) => {
            const g = days.get(date);
            return { date, total: g ? g.paise / 100 : 0, count: g?.count ?? 0 };
          }),
  };
}
