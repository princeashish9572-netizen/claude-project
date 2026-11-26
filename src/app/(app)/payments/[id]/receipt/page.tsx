import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/date";
import { env } from "@/lib/env";
import { formatINR, formatPhone, paymentMethodLabel, toNumber } from "@/lib/format";
import { amountInWords } from "@/lib/words";
import type { Payment } from "@/lib/types";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = { title: "Receipt" };

interface ReceiptRow extends Payment {
  students: { id: string; name: string; phone: string; course: string; guardian_name: string | null } | null;
  payment_allocations: { amount: number; fee_dues: { due_date: string; description: string | null } | null }[];
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("payments")
    .select("*, students(id, name, phone, course, guardian_name), payment_allocations(amount, fee_dues(due_date, description))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();
  const p = data as ReceiptRow;

  // Balance after this payment = student's current pending balance.
  const { data: summary } = await supabase.from("student_fee_summary").select("pending_balance").eq("id", p.student_id).maybeSingle();
  const institute = env.institute;
  const allocations = [...(p.payment_allocations ?? [])].sort((a, b) => (a.fee_dues?.due_date ?? "").localeCompare(b.fee_dues?.due_date ?? ""));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/students/${p.student_id}`} className="btn-secondary">
          ← Back to student
        </Link>
        <PrintButton />
      </div>

      <article className="card relative overflow-hidden p-6 sm:p-10 print:border-0 print:shadow-none">
        {p.voided_at ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="-rotate-12 rounded-lg border-4 border-red-500/60 px-6 py-2 text-5xl font-black tracking-widest text-red-500/60">VOID</span>
          </div>
        ) : null}

        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{institute.name}</h1>
            {institute.address ? <p className="mt-1 text-sm text-slate-600">{institute.address}</p> : null}
            {institute.phone ? <p className="text-sm text-slate-600">{institute.phone}</p> : null}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Fee receipt</p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{p.receipt_no}</p>
            <p className="text-sm text-slate-600">Date: {formatDate(p.paid_on)}</p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Received from</p>
            <p className="font-semibold text-slate-900">{p.students?.name}</p>
            {p.students?.guardian_name ? <p className="text-slate-600">C/o {p.students.guardian_name}</p> : null}
            <p className="text-slate-600">{p.students ? formatPhone(p.students.phone) : null}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-slate-500">Course</p>
            <p className="font-semibold text-slate-900">{p.students?.course}</p>
            <p className="text-slate-600">
              Paid by {paymentMethodLabel(p.method)}
              {p.reference ? ` · Ref ${p.reference}` : ""}
            </p>
          </div>
        </section>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-slate-200 text-left text-xs text-slate-500 uppercase">
              <th className="py-2 font-semibold">Towards</th>
              <th className="py-2 font-semibold">Due date</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allocations.length > 0 ? (
              allocations.map((a, i) => (
                <tr key={i}>
                  <td className="py-2">{a.fee_dues?.description ?? "Fee"}</td>
                  <td className="py-2">{formatDate(a.fee_dues?.due_date)}</td>
                  <td className="py-2 text-right">{formatINR(a.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-2" colSpan={2}>
                  Fee payment
                </td>
                <td className="py-2 text-right">{formatINR(p.amount)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300">
              <td className="py-3 font-semibold" colSpan={2}>
                Total received
              </td>
              <td className="py-3 text-right text-lg font-bold">{formatINR(p.amount)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-2 text-sm text-slate-600 italic">{amountInWords(toNumber(p.amount))}</p>

        <div className="mt-6 flex flex-col gap-1 rounded-lg bg-slate-50 p-4 text-sm print:bg-transparent print:p-0">
          <p>
            Balance outstanding (as of today): <strong>{formatINR(summary?.pending_balance ?? 0)}</strong>
          </p>
          {p.notes ? <p className="text-slate-600">Note: {p.notes}</p> : null}
          {p.voided_at ? (
            <p className="text-red-600">
              Voided on {formatDateTime(p.voided_at)}: {p.void_reason}
            </p>
          ) : null}
        </div>

        <footer className="mt-12 flex items-end justify-between text-xs text-slate-500">
          <p>Recorded {formatDateTime(p.created_at)} IST</p>
          <div className="text-center">
            <div className="mb-1 h-px w-40 bg-slate-400" />
            Authorised signatory
          </div>
        </footer>
      </article>
    </div>
  );
}
