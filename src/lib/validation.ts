import { z } from "zod";
import { BILLING_CYCLES, PAYMENT_METHODS } from "./types";
import { isValidDate } from "./date";

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (label: string, max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `${label} must be at most ${max} characters`).optional());

export const dateField = (label: string) =>
  z.string({ error: `${label} is required` }).refine(isValidDate, `${label} must be a valid date`);

const optionalDate = (label: string) => z.preprocess(emptyToUndefined, dateField(label).optional());

/** Money as typed by a user: up to 7 digits and 2 decimals. */
export const money = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .regex(/^\d{1,7}(\.\d{1,2})?$/, `${label} must be a number with at most 2 decimals`)
    .transform(Number)
    .refine((n) => n > 0, `${label} must be greater than zero`);

/** Normalises Indian phone numbers: strips spaces/dashes, keeps an optional leading +. */
export const phoneField = z
  .string({ error: "Phone is required" })
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .refine((v) => /^\+?[0-9]{10,15}$/.test(v), "Enter a valid phone number (10–15 digits)");

export const studentSchema = z
  .object({
    name: requiredText("Name", 120),
    phone: phoneField,
    email: z.preprocess(emptyToUndefined, z.email("Enter a valid email").max(200).optional()),
    guardian_name: optionalText("Guardian name", 120),
    course: requiredText("Course", 80),
    admission_date: dateField("Admission date"),
    fee_amount: money("Fee amount"),
    billing_cycle: z.enum(BILLING_CYCLES, { error: "Choose a billing cycle" }),
    cycle_interval_months: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int("Interval must be a whole number").min(1).max(36).optional(),
    ),
    schedule_start_date: dateField("Payment due date"),
    end_date: optionalDate("End date"),
    notes: optionalText("Notes", 2000),
  })
  .superRefine((v, ctx) => {
    if (v.billing_cycle === "custom" && !v.cycle_interval_months) {
      ctx.addIssue({ code: "custom", path: ["cycle_interval_months"], message: "Enter the interval in months" });
    }
    if (v.end_date && v.end_date < v.schedule_start_date) {
      ctx.addIssue({ code: "custom", path: ["end_date"], message: "End date must be on or after the due date" });
    }
  })
  .transform((v) => ({
    ...v,
    email: v.email ?? null,
    guardian_name: v.guardian_name ?? null,
    end_date: v.end_date ?? null,
    notes: v.notes ?? null,
    cycle_interval_months: v.billing_cycle === "custom" ? (v.cycle_interval_months ?? null) : null,
  }));

export type StudentInput = z.infer<typeof studentSchema>;

export const paymentSchema = z.object({
  student_id: z.uuid(),
  amount: money("Amount"),
  paid_on: dateField("Payment date"),
  method: z.enum(PAYMENT_METHODS, { error: "Choose a payment method" }),
  reference: optionalText("Reference", 100),
  notes: optionalText("Notes", 1000),
  due_id: z.preprocess(emptyToUndefined, z.uuid().optional()),
});

export const manualDueSchema = z.object({
  student_id: z.uuid(),
  due_date: dateField("Due date"),
  amount: money("Amount"),
  description: requiredText("Description", 200),
});

export const voidSchema = z.object({
  payment_id: z.uuid(),
  student_id: z.uuid(),
  reason: requiredText("Reason", 500),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email").max(200),
  password: z.string().min(1, "Password is required").max(200),
  next: z.string().optional(),
});

/** Converts FormData to a plain object (first value per key). */
export function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !(key in out)) out[key] = value;
  }
  return out;
}

export function fieldErrors(error: z.ZodError): Record<string, string[] | undefined> {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}

/** Only allow same-site relative redirects. */
export function safeRedirectPath(next: string | undefined | null, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.startsWith("/login")) return fallback;
  return next;
}

/** Strip characters that have meaning in PostgREST filter syntax. */
export function sanitizeSearch(q: string | undefined | null): string {
  return (q ?? "")
    .replace(/[^\p{L}\p{N}\s@.+'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}
