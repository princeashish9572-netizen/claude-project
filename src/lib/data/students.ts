import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { DueDetail, PaymentWithStudent, StudentSummary } from "@/lib/types";
import { isValidDate } from "@/lib/date";
import { sanitizeSearch } from "@/lib/validation";

export const STUDENT_PAGE_SIZE = 25;

export const STATUS_FILTERS = ["all", "paid", "pending", "overdue", "due_today"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export interface StudentFilters {
  q?: string;
  course?: string;
  status?: StatusFilter;
  dueFrom?: string;
  dueTo?: string;
  archived?: boolean;
  page?: number;
}

export function parseStudentFilters(sp: Record<string, string | string[] | undefined>): StudentFilters {
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const status = one("status");
  const page = Number(one("page") ?? "1");
  return {
    q: sanitizeSearch(one("q")),
    course: one("course")?.slice(0, 80) || undefined,
    status: (STATUS_FILTERS as readonly string[]).includes(status ?? "") ? (status as StatusFilter) : "all",
    dueFrom: isValidDate(one("due_from")) ? one("due_from") : undefined,
    dueTo: isValidDate(one("due_to")) ? one("due_to") : undefined,
    archived: one("archived") === "1",
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

/**
 * Builds the filtered student query. `paginate` false returns every match
 * (used for CSV/Excel export).
 */
function studentQuery(supabase: ServerSupabase, f: StudentFilters, withCount: boolean) {
  let query = supabase
    .from("student_fee_summary")
    .select("*", withCount ? { count: "exact" } : undefined)
    .eq("status", f.archived ? "archived" : "active");

  if (f.q) {
    const term = `%${f.q}%`;
    const digits = f.q.replace(/\D/g, "");
    query = digits.length >= 3 ? query.or(`name.ilike."${term}",phone.ilike."%${digits}%"`) : query.ilike("name", term);
  }
  if (f.course) query = query.eq("course", f.course);
  switch (f.status) {
    case "paid":
      query = query.eq("pending_balance", 0);
      break;
    case "pending":
      query = query.gt("pending_balance", 0);
      break;
    case "overdue":
      query = query.gt("overdue_amount", 0);
      break;
    case "due_today":
      query = query.gt("due_today_amount", 0);
      break;
  }
  if (f.dueFrom) query = query.gte("next_due_date", f.dueFrom);
  if (f.dueTo) query = query.lte("next_due_date", f.dueTo);
  return query;
}

export async function listStudents(supabase: ServerSupabase, f: StudentFilters) {
  const page = f.page ?? 1;
  const from = (page - 1) * STUDENT_PAGE_SIZE;
  const { data, error, count } = await studentQuery(supabase, f, true)
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + STUDENT_PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return { students: (data ?? []) as StudentSummary[], total: count ?? 0, page, pageSize: STUDENT_PAGE_SIZE };
}

export async function listAllStudents(supabase: ServerSupabase, f: StudentFilters): Promise<StudentSummary[]> {
  const rows: StudentSummary[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await studentQuery(supabase, f, false)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as StudentSummary[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function getCourses(supabase: ServerSupabase): Promise<string[]> {
  const { data, error } = await supabase.rpc("course_list");
  if (error) throw new Error(error.message);
  return ((data ?? []) as string[]).filter(Boolean);
}

export async function getStudent(supabase: ServerSupabase, id: string): Promise<StudentSummary | null> {
  const { data, error } = await supabase.from("student_fee_summary").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as StudentSummary | null;
}

export async function getStudentDues(supabase: ServerSupabase, studentId: string): Promise<DueDetail[]> {
  const { data, error } = await supabase
    .from("due_details")
    .select("*")
    .eq("student_id", studentId)
    .order("due_date", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as DueDetail[];
}

export async function getStudentPayments(supabase: ServerSupabase, studentId: string): Promise<PaymentWithStudent[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*, students(name, phone, course)")
    .eq("student_id", studentId)
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentWithStudent[];
}
