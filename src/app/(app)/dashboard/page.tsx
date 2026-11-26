import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CalendarDays, IndianRupee, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { addDays, formatDate, formatLongDate, todayIST } from "@/lib/date";
import { formatINR, formatPhone, paymentMethodLabel, toNumber } from "@/lib/format";
import type { DashboardSummary, DueDetail, PaymentWithStudent } from "@/lib/types";
import { Card, DueStatusBadge, EmptyState, PageHeader, StatCard } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

const UPCOMING_DAYS = 7;

export default async function DashboardPage() {
  const { supabase } = await requireAdmin();
  const today = todayIST();

  const [summaryRes, todayRes, overdueRes, upcomingRes, recentRes] = await Promise.all([
    supabase.rpc("dashboard_summary", { p_upcoming_days: UPCOMING_DAYS }).single(),
    supabase.from("due_details").select("*").eq("student_status", "active").gt("balance", 0).eq("due_date", today).order("student_name").limit(50),
    supabase.from("due_details").select("*").eq("student_status", "active").gt("balance", 0).lt("due_date", today).order("due_date").limit(10),
    supabase
      .from("due_details")
      .select("*")
      .eq("student_status", "active")
      .gt("balance", 0)
      .gt("due_date", today)
      .lte("due_date", addDays(today, UPCOMING_DAYS))
      .order("due_date")
      .limit(10),
    supabase.from("payments").select("*, students(name, phone, course)").is("voided_at", null).order("created_at", { ascending: false }).limit(8),
  ]);

  for (const r of [summaryRes, todayRes, overdueRes, upcomingRes, recentRes]) {
    if (r.error) throw new Error(r.error.message);
  }

  const s = summaryRes.data as DashboardSummary;
  const dueToday = (todayRes.data ?? []) as DueDetail[];
  const overdue = (overdueRes.data ?? []) as DueDetail[];
  const upcoming = (upcomingRes.data ?? []) as DueDetail[];
  const recent = (recentRes.data ?? []) as PaymentWithStudent[];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${formatLongDate(today)} · India Standard Time`}
        actions={
          <Link href="/students/new" className="btn-primary">
            Add student
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
        <StatCard label="Total students" value={toNumber(s.total_students)} sub={`${toNumber(s.archived_students)} archived`} icon={Users} href="/students" />
        <StatCard
          label="Due today"
          value={formatINR(s.due_today_amount)}
          sub={`${toNumber(s.due_today_count)} due${toNumber(s.due_today_count) === 1 ? "" : "s"}`}
          icon={CalendarClock}
          tone="amber"
          href="/students?status=due_today"
        />
        <StatCard
          label="Overdue"
          value={formatINR(s.overdue_amount)}
          sub={`${toNumber(s.overdue_students)} student${toNumber(s.overdue_students) === 1 ? "" : "s"}`}
          icon={AlertTriangle}
          tone="red"
          href="/students?status=overdue"
        />
        <StatCard
          label="Collected this month"
          value={formatINR(s.month_collection)}
          sub={`${toNumber(s.month_payments)} payments · today ${formatINR(s.today_collection)}`}
          icon={IndianRupee}
          tone="green"
          href="/reports?type=monthly"
        />
        <StatCard
          label={`Upcoming (${UPCOMING_DAYS} days)`}
          value={formatINR(s.upcoming_amount)}
          sub={`${toNumber(s.upcoming_count)} due${toNumber(s.upcoming_count) === 1 ? "" : "s"}`}
          icon={CalendarDays}
          tone="sky"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DueList title="Fees due today" dues={dueToday} empty="No fees are due today." />
        <DueList
          title="Overdue payments"
          dues={overdue}
          empty="Nothing is overdue. 🎉"
          more={toNumber(s.overdue_students) > 0 ? { href: "/students?status=overdue", label: "View all" } : undefined}
          showDays
        />
        <DueList title={`Upcoming in the next ${UPCOMING_DAYS} days`} dues={upcoming} empty="No upcoming fees this week." />
        <Card
          title="Recent payments"
          actions={
            <Link href="/payments" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          }
        >
          {recent.length === 0 ? (
            <EmptyState title="No payments recorded yet." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <Link href={`/students/${p.student_id}`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
                      {p.students?.name}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {formatDate(p.paid_on)} · {paymentMethodLabel(p.method)} · {p.receipt_no}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-emerald-700">{formatINR(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function DueList({
  title,
  dues,
  empty,
  more,
  showDays,
}: {
  title: string;
  dues: DueDetail[];
  empty: string;
  more?: { href: string; label: string };
  showDays?: boolean;
}) {
  return (
    <Card
      title={title}
      actions={
        more ? (
          <Link href={more.href} className="text-sm font-medium text-brand-600 hover:underline">
            {more.label}
          </Link>
        ) : null
      }
    >
      {dues.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {dues.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <Link href={`/students/${d.student_id}`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
                  {d.student_name}
                </Link>
                <p className="truncate text-xs text-slate-500">
                  {d.course} · {formatPhone(d.student_phone)} · Due {formatDate(d.due_date)}
                  {showDays && d.days_overdue > 0 ? ` · ${d.days_overdue}d late` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-semibold text-slate-900">{formatINR(d.balance)}</span>
                <DueStatusBadge status={d.due_status} partial={toNumber(d.amount_paid) > 0} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
