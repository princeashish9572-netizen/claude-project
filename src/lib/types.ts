export const BILLING_CYCLES = ["monthly", "quarterly", "half_yearly", "yearly", "custom", "one_time"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const PAYMENT_METHODS = ["cash", "upi", "card", "bank_transfer", "cheque", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type StudentStatus = "active" | "archived";
export type PaymentStatus = "overdue" | "due_today" | "paid";
export type DueStatus = "paid" | "overdue" | "due_today" | "upcoming";

/** Row of public.student_fee_summary. Numeric columns arrive as numbers or strings. */
export interface StudentSummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  guardian_name: string | null;
  course: string;
  admission_date: string;
  fee_amount: number;
  billing_cycle: BillingCycle;
  cycle_interval_months: number | null;
  schedule_start_date: string;
  end_date: string | null;
  status: StudentStatus;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  total_billed: number;
  total_paid: number;
  pending_balance: number;
  overdue_amount: number;
  due_today_amount: number;
  upcoming_amount: number;
  next_due_date: string | null;
  next_upcoming_date: string | null;
  last_payment_date: string | null;
  payment_status: PaymentStatus;
}

/** Row of public.due_details */
export interface DueDetail {
  id: string;
  student_id: string;
  due_date: string;
  amount: number;
  amount_paid: number;
  balance: number;
  source: "auto" | "manual";
  description: string | null;
  created_at: string;
  student_name: string;
  student_phone: string;
  course: string;
  student_status: StudentStatus;
  due_status: DueStatus;
  days_overdue: number;
}

export interface Payment {
  id: string;
  receipt_no: string;
  student_id: string;
  amount: number;
  paid_on: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  recorded_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
}

export interface PaymentWithStudent extends Payment {
  students: { name: string; phone: string; course: string } | null;
}

export interface DashboardSummary {
  total_students: number;
  archived_students: number;
  due_today_amount: number;
  due_today_count: number;
  overdue_amount: number;
  overdue_students: number;
  month_collection: number;
  month_payments: number;
  today_collection: number;
  upcoming_amount: number;
  upcoming_count: number;
}

export interface ReminderLog {
  id: string;
  reminder_date: string;
  kind: string;
  status: "sending" | "sent" | "failed";
  triggered_by: "cron" | "manual";
  attempts: number;
  due_today_count: number | null;
  overdue_count: number | null;
  total_expected: number | null;
  message: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Standard result shape for server actions consumed by useActionState. */
export interface ActionState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Submitted values, echoed back so the form can be re-filled after an error. */
  values?: Record<string, string>;
}
