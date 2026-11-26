import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth";
import { formatDate, todayIST } from "@/lib/date";
import { env } from "@/lib/env";
import { billingCycleLabel, paymentMethodLabel, toNumber } from "@/lib/format";
import { getCollectionReport, parseReportPeriod } from "@/lib/data/reports";
import { listAllStudents, parseStudentFilters } from "@/lib/data/students";
import { toCsv, toXlsx, type Sheet } from "@/lib/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reports/export?report=collections|outstanding&format=csv|xlsx&...
 * Admin session required (checked here, not just in the proxy). Data is read
 * with the admin's own client, so RLS still applies.
 */
export async function GET(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const format = sp.format === "xlsx" ? "xlsx" : "csv";
  const report = sp.report === "outstanding" ? "outstanding" : "collections";

  try {
    let sheets: Sheet[];
    let baseName: string;

    if (report === "collections") {
      const period = parseReportPeriod(sp);
      const r = await getCollectionReport(admin.supabase, period);
      baseName = `collections_${period.from}_to_${period.to}`;
      sheets = [
        {
          name: "Payments",
          columns: [
            { header: "Receipt No", width: 22 },
            { header: "Date", width: 14 },
            { header: "Student", width: 26 },
            { header: "Phone", width: 16 },
            { header: "Course", width: 18 },
            { header: "Method", width: 14 },
            { header: "Reference", width: 20 },
            { header: "Amount (INR)", width: 16, money: true },
            { header: "Notes", width: 30 },
          ],
          rows: r.payments.map((p) => [
            p.receipt_no,
            p.paid_on,
            p.students?.name ?? "",
            p.students?.phone ?? "",
            p.students?.course ?? "",
            paymentMethodLabel(p.method),
            p.reference ?? "",
            toNumber(p.amount),
            p.notes ?? "",
          ]),
        },
        {
          name: "Summary",
          columns: [
            { header: "Metric", width: 28 },
            { header: "Count", width: 10 },
            { header: "Amount (INR)", width: 16, money: true },
          ],
          rows: [
            [`Period: ${period.label}`, null, null],
            ["Total collection", r.count, r.total],
            [null, null, null],
            ["By payment method", null, null],
            ...r.byMethod.map((m) => [paymentMethodLabel(m.method), m.count, m.total]),
            [null, null, null],
            ["By course", null, null],
            ...r.byCourse.map((c) => [c.course, c.count, c.total]),
            ...(r.byDay.length ? [[null, null, null], ["By day", null, null], ...r.byDay.map((d) => [formatDate(d.date), d.count, d.total])] : []),
          ],
        },
      ];
    } else {
      const filters = parseStudentFilters(sp);
      const students = await listAllStudents(admin.supabase, { ...filters, page: undefined });
      baseName = `outstanding_${todayIST()}`;
      sheets = [
        {
          name: "Students",
          columns: [
            { header: "Name", width: 26 },
            { header: "Phone", width: 16 },
            { header: "Course", width: 18 },
            { header: "Billing", width: 14 },
            { header: "Fee (INR)", width: 12, money: true },
            { header: "Billed to date", width: 16, money: true },
            { header: "Paid", width: 14, money: true },
            { header: "Pending", width: 14, money: true },
            { header: "Overdue", width: 14, money: true },
            { header: "Next due date", width: 14 },
            { header: "Status", width: 12 },
          ],
          rows: students.map((s) => [
            s.name,
            s.phone,
            s.course,
            billingCycleLabel(s.billing_cycle, s.cycle_interval_months),
            toNumber(s.fee_amount),
            toNumber(s.total_billed),
            toNumber(s.total_paid),
            toNumber(s.pending_balance),
            toNumber(s.overdue_amount),
            s.next_due_date ?? "",
            s.payment_status,
          ]),
        },
      ];
    }

    if (format === "xlsx") {
      const body = await toXlsx(sheets, { title: baseName, creator: env.institute.name });
      return new NextResponse(body as BodyInit, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    return new NextResponse(toCsv(sheets[0]!), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("Export failed", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
