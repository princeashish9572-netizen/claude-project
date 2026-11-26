"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { todayIST } from "@/lib/date";
import type { ActionState } from "@/lib/types";
import { fieldErrors, formToObject, manualDueSchema, paymentSchema, studentSchema, voidSchema } from "@/lib/validation";

export type PaymentActionState = ActionState & { paymentId?: string; receiptNo?: string };

const idSchema = z.uuid();

function refresh(studentId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath("/payments");
  if (studentId) revalidatePath(`/students/${studentId}`);
}

export async function createStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const values = formToObject(formData);
  const parsed = studentSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values };

  const { data, error } = await supabase.from("students").insert(parsed.data).select("id").single();
  if (error) return { ok: false, message: friendlyDbError(error), values };

  refresh(data.id);
  redirect(`/students/${data.id}?created=1`);
}

export async function updateStudent(studentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (!idSchema.safeParse(studentId).success) return { ok: false, message: "Invalid student." };
  const values = formToObject(formData);
  const parsed = studentSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values };

  const { data: current, error: loadError } = await supabase
    .from("students")
    .select("fee_amount, billing_cycle, cycle_interval_months")
    .eq("id", studentId)
    .maybeSingle();
  if (loadError) return { ok: false, message: friendlyDbError(loadError), values };
  if (!current) return { ok: false, message: "Student not found." };

  // The form pre-fills the next upcoming due date. Only reschedule when the fee
  // terms or that date actually changed; otherwise keep the original anchor so
  // an unrelated edit (e.g. phone number) never touches existing dues.
  const update: Partial<typeof parsed.data> = { ...parsed.data };
  const scheduleChanged =
    Number(current.fee_amount) !== parsed.data.fee_amount ||
    current.billing_cycle !== parsed.data.billing_cycle ||
    (current.cycle_interval_months ?? null) !== parsed.data.cycle_interval_months ||
    values.shown_due_date !== parsed.data.schedule_start_date;
  if (!scheduleChanged) delete update.schedule_start_date;

  const { error, count } = await supabase.from("students").update(update, { count: "exact" }).eq("id", studentId);
  if (error) return { ok: false, message: friendlyDbError(error), values };
  if (!count) return { ok: false, message: "Student not found." };

  refresh(studentId);
  redirect(`/students/${studentId}?updated=1`);
}

export async function setStudentArchived(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = idSchema.parse(formData.get("student_id"));
  const archive = formData.get("archive") === "1";
  const { error } = await supabase.from("students").update({ status: archive ? "archived" : "active" }).eq("id", id);
  if (error) throw new Error(friendlyDbError(error));
  refresh(id);
  redirect(`/students/${id}?${archive ? "archived" : "restored"}=1`);
}

export async function recordPayment(_prev: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  const { supabase } = await requireAdmin();
  const values = formToObject(formData);
  const parsed = paymentSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values };
  const p = parsed.data;
  if (p.paid_on > todayIST()) return { ok: false, fieldErrors: { paid_on: ["Payment date cannot be in the future"] }, values };

  const { data, error } = await supabase
    .rpc("record_payment", {
      p_student_id: p.student_id,
      p_amount: p.amount,
      p_paid_on: p.paid_on,
      p_method: p.method,
      p_reference: p.reference ?? null,
      p_notes: p.notes ?? null,
      p_due_id: p.due_id ?? null,
    })
    .single();
  if (error) return { ok: false, message: friendlyDbError(error), values };

  const payment = data as { id: string; receipt_no: string };
  refresh(p.student_id);
  return { ok: true, message: `Payment recorded. Receipt ${payment.receipt_no}.`, paymentId: payment.id, receiptNo: payment.receipt_no };
}

export async function voidPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const values = formToObject(formData);
  const parsed = voidSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error), values };

  const { error } = await supabase.rpc("void_payment", { p_payment_id: parsed.data.payment_id, p_reason: parsed.data.reason });
  if (error) return { ok: false, message: friendlyDbError(error) };

  refresh(parsed.data.student_id);
  return { ok: true, message: "Payment voided and balances restored." };
}

export async function addManualDue(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const values = formToObject(formData);
  const parsed = manualDueSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error), values };

  const { error } = await supabase.from("fee_dues").insert(parsed.data);
  if (error) return { ok: false, message: friendlyDbError(error), values };

  refresh(parsed.data.student_id);
  return { ok: true, message: "Fee added." };
}

export async function deleteDue(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const dueId = idSchema.parse(formData.get("due_id"));
  const studentId = idSchema.parse(formData.get("student_id"));
  // RLS only allows deleting dues with nothing paid against them.
  const { error } = await supabase.from("fee_dues").delete().eq("id", dueId).eq("student_id", studentId).eq("amount_paid", 0);
  if (error) throw new Error(friendlyDbError(error));
  refresh(studentId);
}
