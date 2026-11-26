"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PAYMENT_METHODS, type ActionState } from "@/lib/types";
import { PAYMENT_METHOD_LABELS, formatINR } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { addManualDue, recordPayment, voidPayment, type PaymentActionState } from "@/app/(app)/students/actions";
import { Alert, FieldError } from "./ui";
import { SubmitButton } from "./submit-button";

export interface OpenDueOption {
  id: string;
  due_date: string;
  balance: number;
  description: string | null;
}

export function RecordPaymentForm({
  studentId,
  today,
  openDues,
  suggestedAmount,
}: {
  studentId: string;
  today: string;
  openDues: OpenDueOption[];
  suggestedAmount: number;
}) {
  const [state, action] = useActionState<PaymentActionState, FormData>(recordPayment, { ok: false });
  const e = state.fieldErrors ?? {};
  const v = state.ok ? {} : (state.values ?? {});

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>
          {state.message}{" "}
          {state.ok && state.paymentId ? (
            <Link href={`/payments/${state.paymentId}/receipt`} className="font-medium underline">
              View receipt
            </Link>
          ) : null}
        </Alert>
      ) : null}
      <input type="hidden" name="student_id" value={studentId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">
            Amount (₹) *
          </label>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            className="input"
            required
            defaultValue={v.amount ?? (suggestedAmount > 0 ? String(suggestedAmount) : "")}
            key={state.ok ? `ok-${state.paymentId}` : "form"}
          />
          <FieldError errors={e.amount} />
        </div>
        <div>
          <label className="label" htmlFor="paid_on">
            Payment date *
          </label>
          <input id="paid_on" name="paid_on" type="date" max={today} className="input" required defaultValue={v.paid_on ?? today} />
          <FieldError errors={e.paid_on} />
        </div>
        <div>
          <label className="label" htmlFor="method">
            Method *
          </label>
          <select id="method" name="method" className="input" defaultValue={v.method ?? "cash"}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
          <FieldError errors={e.method} />
        </div>
        <div>
          <label className="label" htmlFor="reference">
            Reference / UTR
          </label>
          <input id="reference" name="reference" className="input" maxLength={100} defaultValue={v.reference ?? ""} />
          <FieldError errors={e.reference} />
        </div>
        {openDues.length > 0 ? (
          <div className="sm:col-span-2">
            <label className="label" htmlFor="due_id">
              Apply to
            </label>
            <select id="due_id" name="due_id" className="input" defaultValue={v.due_id ?? ""}>
              <option value="">Oldest outstanding dues first (recommended)</option>
              {openDues.map((d) => (
                <option key={d.id} value={d.id}>
                  {formatDate(d.due_date)} · {d.description ?? "Fee"} · {formatINR(d.balance)} left
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Any amount above the selected due is applied to the oldest remaining dues, then to upcoming cycles.</p>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pay_notes">
            Notes
          </label>
          <input id="pay_notes" name="notes" className="input" maxLength={1000} defaultValue={v.notes ?? ""} />
        </div>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Recording…">Record payment</SubmitButton>
      </div>
    </form>
  );
}

export function ManualDueForm({ studentId, today }: { studentId: string; today: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addManualDue, { ok: false });
  const e = state.fieldErrors ?? {};
  const v = state.ok ? {} : (state.values ?? {});
  return (
    <form action={action} className="space-y-3" noValidate>
      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}
      <input type="hidden" name="student_id" value={studentId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className="label" htmlFor="description">
            Description *
          </label>
          <input id="description" name="description" className="input" placeholder="e.g. Exam fee, Study material" maxLength={200} defaultValue={v.description ?? ""} />
          <FieldError errors={e.description} />
        </div>
        <div>
          <label className="label" htmlFor="due_amount">
            Amount (₹) *
          </label>
          <input id="due_amount" name="amount" inputMode="decimal" className="input" defaultValue={v.amount ?? ""} />
          <FieldError errors={e.amount} />
        </div>
        <div>
          <label className="label" htmlFor="due_date">
            Due date *
          </label>
          <input id="due_date" name="due_date" type="date" className="input" defaultValue={v.due_date ?? today} />
          <FieldError errors={e.due_date} />
        </div>
        <div className="flex items-end">
          <SubmitButton variant="secondary" className="w-full" pendingText="Adding…">
            Add fee
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

export function VoidPaymentForm({ paymentId, studentId }: { paymentId: string; studentId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(voidPayment, { ok: false });
  if (state.ok) return <p className="text-xs text-emerald-700">{state.message}</p>;
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-xs font-medium text-red-600 hover:underline">Void</summary>
      <form
        action={action}
        className="mt-2 flex w-64 flex-col gap-2"
        onSubmit={(ev) => {
          if (!confirm("Void this payment? The amount will be added back to the student's balance.")) ev.preventDefault();
        }}
      >
        <input type="hidden" name="payment_id" value={paymentId} />
        <input type="hidden" name="student_id" value={studentId} />
        <input name="reason" className="input" placeholder="Reason (e.g. cheque bounced)" maxLength={500} required />
        <FieldError errors={state.fieldErrors?.reason} />
        {state.message ? <p className="text-xs text-red-600">{state.message}</p> : null}
        <SubmitButton variant="danger" className="px-3 py-1.5" pendingText="Voiding…">
          Confirm void
        </SubmitButton>
      </form>
    </details>
  );
}
