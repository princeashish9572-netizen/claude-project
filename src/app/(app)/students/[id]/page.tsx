import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Archive, ArchiveRestore, MessageCircle, Pencil, Phone, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getStudent, getStudentDues, getStudentPayments } from "@/lib/data/students";
import { formatDate, formatDateTime, todayIST } from "@/lib/date";
import { billingCycleLabel, formatINR, formatPhone, paymentMethodLabel, toNumber } from "@/lib/format";
import { Alert, Badge, Card, DueStatusBadge, EmptyState, PageHeader, PaymentStatusBadge } from "@/components/ui";
import { ManualDueForm, RecordPaymentForm, VoidPaymentForm } from "@/components/payment-forms";
import { deleteDue, setStudentArchived } from "../actions";

export const metadata: Metadata = { title: "Student" };

const FLASH: Record<string, string> = {
  created: "Student added and fee schedule created.",
  updated: "Student details saved.",
  archived: "Student archived. Future dues were removed; outstanding balances are kept.",
  restored: "Student restored. Billing resumes from the next cycle.",
};

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const [student, dues, payments] = await Promise.all([getStudent(supabase, id), getStudentDues(supabase, id), getStudentPayments(supabase, id)]);
  if (!student) notFound();

  const today = todayIST();
  const flash = Object.keys(FLASH).find((k) => sp[k]);
  const openDues = dues
    .filter((d) => toNumber(d.balance) > 0)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .map((d) => ({ id: d.id, due_date: d.due_date, balance: toNumber(d.balance), description: d.description }));
  const archived = student.status === "archived";
  const whatsappNumber = student.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1");

  return (
    <>
      <PageHeader
        title={student.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {student.course}
            <PaymentStatusBadge status={student.payment_status} />
            {archived ? <Badge>Archived</Badge> : null}
          </span>
        }
        actions={
          <>
            <Link href={`/students/${student.id}/edit`} className="btn-secondary">
              <Pencil className="size-4" aria-hidden /> Edit
            </Link>
            <form action={setStudentArchived}>
              <input type="hidden" name="student_id" value={student.id} />
              <input type="hidden" name="archive" value={archived ? "0" : "1"} />
              <button type="submit" className="btn-secondary">
                {archived ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
                {archived ? "Restore" : "Archive"}
              </button>
            </form>
          </>
        }
      />

      {flash ? (
        <div className="mb-4">
          <Alert tone="success">{FLASH[flash]}</Alert>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Summary label="Pending balance" value={formatINR(student.pending_balance)} tone={toNumber(student.pending_balance) > 0 ? "text-amber-700" : undefined} />
        <Summary label="Overdue" value={formatINR(student.overdue_amount)} tone={toNumber(student.overdue_amount) > 0 ? "text-red-600" : undefined} />
        <Summary label="Total paid" value={formatINR(student.total_paid)} tone="text-emerald-700" />
        <Summary label={toNumber(student.overdue_amount) > 0 ? "Oldest unpaid due" : "Next due"} value={formatDate(student.next_due_date)} sub={toNumber(student.upcoming_amount) > 0 ? `${formatINR(student.upcoming_amount)} upcoming` : undefined} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card title="Details">
            <dl className="divide-y divide-slate-100 text-sm">
              <Row label="Phone">
                <span className="flex flex-wrap items-center gap-3">
                  {formatPhone(student.phone)}
                  <a href={`tel:${student.phone}`} className="text-brand-600" aria-label="Call">
                    <Phone className="size-4" />
                  </a>
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600" aria-label="WhatsApp">
                    <MessageCircle className="size-4" />
                  </a>
                </span>
              </Row>
              {student.email ? <Row label="Email">{student.email}</Row> : null}
              {student.guardian_name ? <Row label="Guardian">{student.guardian_name}</Row> : null}
              <Row label="Course">{student.course}</Row>
              <Row label="Admission">{formatDate(student.admission_date)}</Row>
              <Row label="Fee">
                {formatINR(student.fee_amount)} · {billingCycleLabel(student.billing_cycle, student.cycle_interval_months)}
              </Row>
              {student.end_date ? <Row label="Ends">{formatDate(student.end_date)}</Row> : null}
              <Row label="Billed to date">{formatINR(student.total_billed)}</Row>
              <Row label="Last payment">{formatDate(student.last_payment_date)}</Row>
              {student.notes ? <Row label="Notes">{student.notes}</Row> : null}
            </dl>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Record payment">
            <div className="p-4 sm:p-5">
              {openDues.length === 0 && archived ? (
                <p className="text-sm text-slate-500">No outstanding balance. Restore the student to accept advance payments.</p>
              ) : (
                <RecordPaymentForm studentId={student.id} today={today} openDues={openDues} suggestedAmount={toNumber(student.pending_balance)} />
              )}
            </div>
          </Card>

          <Card title="Fee schedule">
            {dues.length === 0 ? (
              <EmptyState title="No dues yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Due date</th>
                      <th>Description</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Paid</th>
                      <th className="text-right">Balance</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dues.map((d) => (
                      <tr key={d.id}>
                        <td>{formatDate(d.due_date)}</td>
                        <td className="max-w-56 truncate" title={d.description ?? ""}>
                          {d.description ?? "—"}
                          {d.source === "manual" ? <span className="ml-1 text-xs text-slate-400">(one-off)</span> : null}
                        </td>
                        <td className="text-right">{formatINR(d.amount)}</td>
                        <td className="text-right">{formatINR(d.amount_paid)}</td>
                        <td className="text-right font-medium">{formatINR(d.balance)}</td>
                        <td>
                          <DueStatusBadge status={d.due_status} partial={toNumber(d.amount_paid) > 0} />
                        </td>
                        <td className="text-right">
                          {toNumber(d.amount_paid) === 0 ? (
                            <form action={deleteDue}>
                              <input type="hidden" name="due_id" value={d.id} />
                              <input type="hidden" name="student_id" value={student.id} />
                              <button type="submit" className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove this due" title="Remove this due (waive)">
                                <Trash2 className="size-4" />
                              </button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Payment history">
            {payments.length === 0 ? (
              <EmptyState title="No payments recorded." />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Receipt</th>
                      <th>Date</th>
                      <th className="text-right">Amount</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
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
                            <div className="text-xs text-red-600" title={p.void_reason ?? ""}>
                              Voided {formatDateTime(p.voided_at)}
                            </div>
                          ) : null}
                        </td>
                        <td>{formatDate(p.paid_on)}</td>
                        <td className={`text-right font-medium ${p.voided_at ? "line-through" : ""}`}>{formatINR(p.amount)}</td>
                        <td>{paymentMethodLabel(p.method)}</td>
                        <td className="max-w-40 truncate">{p.reference ?? "—"}</td>
                        <td>{p.voided_at ? null : <VoidPaymentForm paymentId={p.id} studentId={student.id} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Add a one-off fee">
            <div className="p-4 sm:p-5">
              <ManualDueForm studentId={student.id} today={today} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Summary({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-lg font-semibold sm:text-xl ${tone ?? "text-slate-900"}`}>{value}</p>
      {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 px-4 py-2.5 sm:px-5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 break-words text-slate-900">{children}</dd>
    </div>
  );
}
