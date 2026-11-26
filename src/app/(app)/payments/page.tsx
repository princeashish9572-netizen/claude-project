import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { addDays, formatDate, isValidDate, todayIST } from "@/lib/date";
import { PAYMENT_METHOD_LABELS, formatINR, paymentMethodLabel } from "@/lib/format";
import { PAYMENT_METHODS, type PaymentMethod, type PaymentWithStudent } from "@/lib/types";
import { sanitizeSearch } from "@/lib/validation";
import { Badge, Card, EmptyState, PageHeader, Pagination, withParams } from "@/components/ui";

export const metadata: Metadata = { title: "Payments" };

const PAGE_SIZE = 30;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const today = todayIST();

  const q = sanitizeSearch(sp.q);
  const from = isValidDate(sp.from) ? sp.from : addDays(today, -30);
  const to = isValidDate(sp.to) ? sp.to : today;
  const method = (PAYMENT_METHODS as readonly string[]).includes(sp.method ?? "") ? (sp.method as PaymentMethod) : undefined;
  const showVoided = sp.voided === "1";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(sp.page ?? "1", 10) || 1));

  let query = supabase
    .from("payments")
    .select("*, students!inner(name, phone, course)", { count: "exact" })
    .gte("paid_on", from)
    .lte("paid_on", to);
  if (!showVoided) query = query.is("voided_at", null);
  if (method) query = query.eq("method", method);
  if (q) {
    const digits = q.replace(/\D/g, "");
    if (/^RCP/i.test(q)) query = query.ilike("receipt_no", `%${q}%`);
    else if (digits.length >= 3 && digits.length === q.replace(/[\s+]/g, "").length) query = query.ilike("students.phone", `%${digits}%`);
    else query = query.ilike("students.name", `%${q}%`);
  }

  const { data, error, count } = await query
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  const payments = (data ?? []) as PaymentWithStudent[];
  const params = { q, from, to, method, voided: showVoided };

  return (
    <>
      <PageHeader title="Payments" description={`${count ?? 0} payment${count === 1 ? "" : "s"} from ${formatDate(from)} to ${formatDate(to)}`} />

      <form method="get" className="card mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-5" role="search">
        <div className="col-span-2 md:col-span-2">
          <label htmlFor="q" className="label">
            Search
          </label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Student, phone or receipt no." className="input" />
        </div>
        <div>
          <label htmlFor="from" className="label">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={from} className="input" />
        </div>
        <div>
          <label htmlFor="to" className="label">
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={to} className="input" />
        </div>
        <div className="col-span-2 md:col-span-1">
          <label htmlFor="method" className="label">
            Method
          </label>
          <select id="method" name="method" defaultValue={method ?? ""} className="input">
            <option value="">All methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 md:col-span-5">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="voided" value="1" defaultChecked={showVoided} className="size-4 rounded border-slate-300" />
            Include voided payments
          </label>
          <button type="submit" className="btn-primary">
            Apply
          </button>
        </div>
      </form>

      <Card>
        {payments.length === 0 ? (
          <EmptyState title="No payments found for these filters." />
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {payments.map((p) => (
                <li key={p.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/students/${p.student_id}`} className="block truncate font-medium text-slate-900">
                        {p.students?.name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {formatDate(p.paid_on)} · {paymentMethodLabel(p.method)}
                      </p>
                    </div>
                    <span className={`font-semibold ${p.voided_at ? "text-slate-400 line-through" : "text-emerald-700"}`}>{formatINR(p.amount)}</span>
                  </div>
                  <Link href={`/payments/${p.id}/receipt`} className="mt-1 inline-block text-xs font-medium text-brand-600">
                    {p.receipt_no} →
                  </Link>
                  {p.voided_at ? <Badge tone="red">Voided</Badge> : null}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className={p.voided_at ? "opacity-60" : undefined}>
                      <td>
                        <Link href={`/payments/${p.id}/receipt`} className="font-medium text-brand-600 hover:underline">
                          {p.receipt_no}
                        </Link>
                        {p.voided_at ? (
                          <span className="ml-2">
                            <Badge tone="red">Voided</Badge>
                          </span>
                        ) : null}
                      </td>
                      <td>{formatDate(p.paid_on)}</td>
                      <td>
                        <Link href={`/students/${p.student_id}`} className="hover:underline">
                          {p.students?.name}
                        </Link>
                      </td>
                      <td>{p.students?.course}</td>
                      <td>{paymentMethodLabel(p.method)}</td>
                      <td className="max-w-40 truncate">{p.reference ?? "—"}</td>
                      <td className={`text-right font-medium ${p.voided_at ? "line-through" : ""}`}>{formatINR(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={(n) => withParams("/payments", { ...params, page: n })} />
          </>
        )}
      </Card>
    </>
  );
}
