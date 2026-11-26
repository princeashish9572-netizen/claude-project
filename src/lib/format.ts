import type { BillingCycle, PaymentMethod } from "./types";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Sum money values without floating point drift (works in paise). */
export function sumMoney(values: Iterable<unknown>): number {
  let paise = 0;
  for (const v of values) paise += Math.round(toNumber(v) * 100);
  return paise / 100;
}

export function formatINR(value: unknown): string {
  return inr.format(toNumber(value));
}

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  yearly: "Yearly",
  custom: "Custom",
  one_time: "One-time",
};

export function billingCycleLabel(cycle: BillingCycle, intervalMonths?: number | null): string {
  if (cycle === "custom" && intervalMonths) {
    return intervalMonths === 1 ? "Every month" : `Every ${intervalMonths} months`;
  }
  return BILLING_CYCLE_LABELS[cycle] ?? cycle;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
};

export function paymentMethodLabel(m: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[m] ?? m;
}

/** Display an Indian phone number nicely: 9876543210 -> 98765 43210 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return phone;
}
