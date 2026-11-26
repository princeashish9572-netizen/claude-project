import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getCollectionReport, parseReportPeriod, type ReportType } from "@/lib/data/reports";
import { currentMonthIST, formatDate, todayIST } from "@/lib/date";
import { formatINR, paymentMethodLabel } from "@/lib/format";
import { Card, EmptyState, PageHeader, cn, withParams } from "@/components/ui";

export const metadata: Metadata = { title: "Reports" };

const TABS: { type: ReportType; label: string }[] = [
  { type: "daily", label: "Daily" },
  { type: "monthly", label: "Monthly" },
  { type: "range", label: "Date range" },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const period = parseReportPeriod(await searchParams);
  const report = await getCollectionReport(supabase, period);
  const today = todayIST();
  const exportHref = (format: "csv" | "xlsx") => withParams("/api/reports/export", { ...period.params, report: "collections", format });
  const maxDay = Math.max(1, ...report.byDay.map((d) => d.total));

  return (
    <>
      <PageHeader
        title="Collection reports"
        description={`${period.label} · all dates in IST`}
        actions={
          <>
            <a href={exportHref("xlsx")} className="btn-secondary">
              <Download className="size-4" aria-hidden /> Excel
            </a>
            <a href={exportHref("csv")} className="btn-secondary">
              <Download className="size-4" aria-hidden /> CSV
            </a>
          </>
        }
      />

      <div className="card mb-4 p-4">
        <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1" role="tablist">
          {TABS.map((t) => (
            <Link
              key={t.type}
              href={`/reports?type=${t.type}`}
              role="tab"
              aria-selected={period.type === t.type}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                period.type === t.type ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="type" value={period.type} />
          {period.type === "daily" ? (
            <div>
              <label htmlFor="date" className="label">
                Date
              </label>
              <input id="date" name="date" type="date" max={today} defaultValue={period.from} className="input" />
            </div>
          ) : period.type === "monthly" ? (
            <div>
              <label htmlFor="month" className="label">
                Month
              </label>
              <input id="month" name="month" type="month" max={currentMonthIST()} defaultValue={period.params.month} className="input" />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="from" className="label">
                  From
                </label>
                <input id="from" name="from" type="date" defaultValue={period.from} className="input" />
              </div>
              <div>
                <label htmlFor="to" className="label">
                  To
                </label>
                <input id="to" name="to" type="date" defaultValue={period.to} className="input" />
              </div>
            </>
          )}
          <button type="submit" className="btn-primary">
            Show report
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="card p-4 sm:col-span-1">
          <p className="text-sm text-slate-500">Total collected</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{formatINR(report.total)}</p>
          <p className="text-xs text-slate-500">
            {report.count} payment{report.count === 1 ? "" : "s"}
          </p>
        </div>
        <Card title="By method" className="sm:col-span-1">
          <Breakdown rows={report.byMethod.map((m) => ({ label: paymentMethodLabel(m.method), total: m.total, count: m.count }))} />
        </Card>
        <Card title="By course" className="sm:col-span-1">
          <Breakdown rows={report.byCourse.map((c) => ({ label: c.course, total: c.total, count: c.count }))} />
        </Card>
      </div>

      {report.byDay.length > 0 ? (
        <Card title="Daily collection" className="mt-6">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="w-1/2">
                    <span className="sr-only">Bar</span>
                  </th>
                  <th className="text-right">Payments</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.byDay.map((d) => (
                  <tr key={d.date}>
                    <td>
                      <Link href={`/reports?type=daily&date=${d.date}`} className="hover:underline">
                        {formatDate(d.date)}
                      </Link>
                    </td>
                    <td>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(d.total / maxDay) * 100}%` }} />
                      </div>
                    </td>
                    <td className="text-right">{d.count}</td>
                    <td className="text-right font-medium">{formatINR(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card title="Payments" className="mt-6">
        {report.payments.length === 0 ? (
          <EmptyState title="No payments in this period." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Receipt</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Method</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.paid_on)}</td>
                    <td>
                      <Link href={`/payments/${p.id}/receipt`} className="text-brand-600 hover:underline">
                        {p.receipt_no}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/students/${p.student_id}`} className="hover:underline">
                        {p.students?.name}
                      </Link>
                    </td>
                    <td>{p.students?.course}</td>
                    <td>{paymentMethodLabel(p.method)}</td>
                    <td className="text-right font-medium">{formatINR(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-3" colSpan={5}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right">{formatINR(report.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Breakdown({ rows }: { rows: { label: string; total: number; count: number }[] }) {
  if (rows.length === 0) return <p className="px-4 py-3 text-sm text-slate-500">—</p>;
  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {rows.map((r) => (
        <li key={r.label} className="flex justify-between gap-3 px-4 py-2">
          <span className="truncate text-slate-700">
            {r.label} <span className="text-xs text-slate-400">({r.count})</span>
          </span>
          <span className="font-medium">{formatINR(r.total)}</span>
        </li>
      ))}
    </ul>
  );
}
