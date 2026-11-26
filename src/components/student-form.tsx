"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { BILLING_CYCLES, type ActionState, type BillingCycle } from "@/lib/types";
import { BILLING_CYCLE_LABELS } from "@/lib/format";
import { Alert, FieldError } from "./ui";
import { SubmitButton } from "./submit-button";

export interface StudentFormValues {
  name?: string;
  phone?: string;
  email?: string | null;
  guardian_name?: string | null;
  course?: string;
  admission_date?: string;
  fee_amount?: number | string;
  billing_cycle?: BillingCycle;
  cycle_interval_months?: number | null;
  schedule_start_date?: string;
  end_date?: string | null;
  notes?: string | null;
}

export function StudentForm({
  action,
  defaults,
  courses,
  mode,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults: StudentFormValues;
  courses: string[];
  mode: "create" | "edit";
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const [cycle, setCycle] = useState<BillingCycle>(defaults.billing_cycle ?? "monthly");
  const e = state.fieldErrors ?? {};
  // After a failed submit, re-fill with what the user typed (React resets forms after actions).
  const v: Record<string, string | undefined> = {
    name: defaults.name,
    phone: defaults.phone,
    email: defaults.email ?? "",
    guardian_name: defaults.guardian_name ?? "",
    course: defaults.course,
    admission_date: defaults.admission_date,
    fee_amount: defaults.fee_amount?.toString(),
    cycle_interval_months: (defaults.cycle_interval_months ?? 2).toString(),
    schedule_start_date: defaults.schedule_start_date,
    end_date: defaults.end_date ?? "",
    notes: defaults.notes ?? "",
    ...state.values,
  };

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}
      {mode === "edit" ? <input type="hidden" name="shown_due_date" value={defaults.schedule_start_date ?? ""} /> : null}

      <section className="card p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Student details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">
              Full name *
            </label>
            <input id="name" name="name" className="input" defaultValue={v.name} required maxLength={120} autoComplete="off" />
            <FieldError errors={e.name} />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone *
            </label>
            <input id="phone" name="phone" type="tel" inputMode="tel" className="input" defaultValue={v.phone} required placeholder="98765 43210" />
            <FieldError errors={e.phone} />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" className="input" defaultValue={v.email} />
            <FieldError errors={e.email} />
          </div>
          <div>
            <label className="label" htmlFor="guardian_name">
              Parent / guardian
            </label>
            <input id="guardian_name" name="guardian_name" className="input" defaultValue={v.guardian_name} maxLength={120} />
            <FieldError errors={e.guardian_name} />
          </div>
          <div>
            <label className="label" htmlFor="course">
              Course *
            </label>
            <input id="course" name="course" list="course-options" className="input" defaultValue={v.course} required maxLength={80} autoComplete="off" />
            <datalist id="course-options">
              {courses.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <FieldError errors={e.course} />
          </div>
          <div>
            <label className="label" htmlFor="admission_date">
              Admission date *
            </label>
            <input id="admission_date" name="admission_date" type="date" className="input" defaultValue={v.admission_date} required />
            <FieldError errors={e.admission_date} />
          </div>
        </div>
      </section>

      <section className="card p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900">Fee schedule</h2>
        <p className="mt-1 mb-4 text-xs text-slate-500">
          {mode === "create"
            ? "Fee dues are generated automatically from the payment due date, repeating every billing cycle."
            : "Changing the amount, cycle or due date re-creates unpaid dues from the new due date onwards. Dues before that date, and anything already paid, are kept."}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="fee_amount">
              Fee amount (₹) *
            </label>
            <input id="fee_amount" name="fee_amount" inputMode="decimal" className="input" defaultValue={v.fee_amount} required placeholder="2500" />
            <FieldError errors={e.fee_amount} />
          </div>
          <div>
            <label className="label" htmlFor="billing_cycle">
              Billing cycle *
            </label>
            <select id="billing_cycle" name="billing_cycle" className="input" value={cycle} onChange={(ev) => setCycle(ev.target.value as BillingCycle)}>
              {BILLING_CYCLES.map((c) => (
                <option key={c} value={c}>
                  {BILLING_CYCLE_LABELS[c]}
                </option>
              ))}
            </select>
            <FieldError errors={e.billing_cycle} />
          </div>
          {cycle === "custom" ? (
            <div>
              <label className="label" htmlFor="cycle_interval_months">
                Repeat every (months) *
              </label>
              <input
                id="cycle_interval_months"
                name="cycle_interval_months"
                type="number"
                min={1}
                max={36}
                className="input"
                defaultValue={v.cycle_interval_months}
              />
              <FieldError errors={e.cycle_interval_months} />
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="schedule_start_date">
              {mode === "create" ? "First payment due date *" : "Next payment due date *"}
            </label>
            <input id="schedule_start_date" name="schedule_start_date" type="date" className="input" defaultValue={v.schedule_start_date} required />
            <FieldError errors={e.schedule_start_date} />
          </div>
          {cycle !== "one_time" ? (
            <div>
              <label className="label" htmlFor="end_date">
                Course end date
              </label>
              <input id="end_date" name="end_date" type="date" className="input" defaultValue={v.end_date} />
              <p className="mt-1 text-xs text-slate-500">Optional. No dues are created after this date.</p>
              <FieldError errors={e.end_date} />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="notes">
              Notes
            </label>
            <textarea id="notes" name="notes" rows={3} className="input" defaultValue={v.notes} maxLength={2000} />
            <FieldError errors={e.notes} />
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className="btn-secondary">
          Cancel
        </Link>
        <SubmitButton pendingText="Saving…">{mode === "create" ? "Add student" : "Save changes"}</SubmitButton>
      </div>
    </form>
  );
}
