import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { DueStatus, PaymentStatus } from "@/lib/types";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const TONES = {
  indigo: "bg-indigo-50 text-indigo-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  green: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
} as const;

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "indigo",
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  href?: string;
}) {
  const body = (
    <div className="card flex h-full items-start gap-4 p-4 transition hover:shadow-md sm:p-5">
      <div className={cn("rounded-lg p-2.5", TONES[tone])}>
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold text-slate-900 sm:text-2xl">{value}</p>
        {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-xl focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

const BADGE_TONES = {
  gray: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
} as const;

export function Badge({ tone = "gray", children }: { tone?: keyof typeof BADGE_TONES; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", BADGE_TONES[tone])}>
      {children}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "overdue") return <Badge tone="red">Overdue</Badge>;
  if (status === "due_today") return <Badge tone="amber">Due today</Badge>;
  return <Badge tone="green">Up to date</Badge>;
}

export function DueStatusBadge({ status, partial }: { status: DueStatus; partial?: boolean }) {
  const main =
    status === "paid" ? (
      <Badge tone="green">Paid</Badge>
    ) : status === "overdue" ? (
      <Badge tone="red">Overdue</Badge>
    ) : status === "due_today" ? (
      <Badge tone="amber">Due today</Badge>
    ) : (
      <Badge tone="blue">Upcoming</Badge>
    );
  return (
    <span className="inline-flex gap-1">
      {main}
      {partial && status !== "paid" ? <Badge tone="indigo">Partial</Badge> : null}
    </span>
  );
}

export function Card({ title, actions, children, className }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {children ? <div className="mt-1 text-sm text-slate-500">{children}</div> : null}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warning"; children: React.ReactNode }) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-800",
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

export function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm" aria-label="Pagination">
      <p className="text-slate-500">
        {from}–{to} of {total}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="btn-secondary px-3 py-1.5" href={hrefFor(page - 1)}>
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link className="btn-secondary px-3 py-1.5" href={hrefFor(page + 1)}>
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

/** Builds a URL with updated query params, dropping empty ones. */
export function withParams(path: string, params: Record<string, string | number | undefined | null | boolean>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    sp.set(k, v === true ? "1" : String(v));
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}
