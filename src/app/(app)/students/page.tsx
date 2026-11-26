import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getCourses, listStudents, parseStudentFilters } from "@/lib/data/students";
import { formatDate } from "@/lib/date";
import { billingCycleLabel, formatINR, formatPhone, toNumber } from "@/lib/format";
import { Card, EmptyState, PageHeader, Pagination, PaymentStatusBadge, withParams } from "@/components/ui";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const filters = parseStudentFilters(await searchParams);
  const [{ students, total, page, pageSize }, courses] = await Promise.all([listStudents(supabase, filters), getCourses(supabase)]);

  const params = {
    q: filters.q,
    course: filters.course,
    status: filters.status === "all" ? undefined : filters.status,
    due_from: filters.dueFrom,
    due_to: filters.dueTo,
    archived: filters.archived,
  };
  const hasFilters = Object.values(params).some(Boolean);

  return (
    <>
      <PageHeader
        title={filters.archived ? "Archived students" : "Students"}
        description={`${total} ${filters.archived ? "archived" : "active"} student${total === 1 ? "" : "s"}${hasFilters ? " matching filters" : ""}`}
        actions={
          <>
            <a href={withParams("/api/reports/export", { ...params, report: "outstanding", format: "xlsx" })} className="btn-secondary">
              <Download className="size-4" aria-hidden /> Excel
            </a>
            <a href={withParams("/api/reports/export", { ...params, report: "outstanding", format: "csv" })} className="btn-secondary">
              <Download className="size-4" aria-hidden /> CSV
            </a>
            <Link href="/students/new" className="btn-primary">
              <Plus className="size-4" aria-hidden /> Add student
            </Link>
          </>
        }
      />

      <form method="get" className="card mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-6" role="search">
        <div className="col-span-2 md:col-span-2">
          <label htmlFor="q" className="label">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="Name or phone" className="input pl-9" />
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="course" className="label">
            Course
          </label>
          <select id="course" name="course" defaultValue={filters.course ?? ""} className="input">
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="status" className="label">
            Fee status
          </label>
          <select id="status" name="status" defaultValue={filters.status} className="input">
            <option value="all">All</option>
            <option value="paid">Paid (up to date)</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="due_today">Due today</option>
          </select>
        </div>
        <div>
          <label htmlFor="due_from" className="label">
            Due from
          </label>
          <input id="due_from" name="due_from" type="date" defaultValue={filters.dueFrom} className="input" />
        </div>
        <div>
          <label htmlFor="due_to" className="label">
            Due to
          </label>
          <input id="due_to" name="due_to" type="date" defaultValue={filters.dueTo} className="input" />
        </div>
        <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 md:col-span-6">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="archived" value="1" defaultChecked={filters.archived} className="size-4 rounded border-slate-300" />
            Show archived students
          </label>
          <div className="flex gap-2">
            {hasFilters ? (
              <Link href="/students" className="btn-secondary">
                Clear
              </Link>
            ) : null}
            <button type="submit" className="btn-primary">
              Apply filters
            </button>
          </div>
        </div>
      </form>

      <Card>
        {students.length === 0 ? (
          <EmptyState title="No students found">
            {hasFilters ? "Try changing the filters." : <Link href="/students/new" className="text-brand-600 hover:underline">Add your first student</Link>}
          </EmptyState>
        ) : (
          <>
            {/* Mobile: cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {students.map((s) => (
                <li key={s.id}>
                  <Link href={`/students/${s.id}`} className="block px-4 py-3 active:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{s.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {s.course} · {formatPhone(s.phone)}
                        </p>
                      </div>
                      <PaymentStatusBadge status={s.payment_status} />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-slate-600">
                      <span>
                        Pending <strong className="text-slate-900">{formatINR(s.pending_balance)}</strong>
                      </span>
                      <span>Due {formatDate(s.next_due_date)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Fee</th>
                    <th className="text-right">Pending</th>
                    <th className="text-right">Overdue</th>
                    <th>Unpaid since / next due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/students/${s.id}`} className="font-medium text-slate-900 hover:text-brand-600 hover:underline">
                          {s.name}
                        </Link>
                        <div className="text-xs text-slate-500">{formatPhone(s.phone)}</div>
                      </td>
                      <td>{s.course}</td>
                      <td>
                        {formatINR(s.fee_amount)}
                        <div className="text-xs text-slate-500">{billingCycleLabel(s.billing_cycle, s.cycle_interval_months)}</div>
                      </td>
                      <td className="text-right font-medium">{formatINR(s.pending_balance)}</td>
                      <td className={`text-right ${toNumber(s.overdue_amount) > 0 ? "font-medium text-red-600" : ""}`}>{formatINR(s.overdue_amount)}</td>
                      <td>{formatDate(s.next_due_date)}</td>
                      <td>
                        <PaymentStatusBadge status={s.payment_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} hrefFor={(p) => withParams("/students", { ...params, page: p })} />
          </>
        )}
      </Card>
    </>
  );
}
