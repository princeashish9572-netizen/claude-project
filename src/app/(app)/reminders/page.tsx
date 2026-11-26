import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatDateTime, formatLongDate, todayIST } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { buildTodayDigest } from "@/lib/reminders/run";
import { telegramHtmlToText } from "@/lib/reminders/digest";
import { isTelegramConfigured } from "@/lib/telegram";
import { env } from "@/lib/env";
import type { ReminderLog } from "@/lib/types";
import { Alert, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ReminderControls } from "./reminder-controls";

export const metadata: Metadata = { title: "Reminders" };

export default async function RemindersPage() {
  const { supabase } = await requireAdmin();
  const today = todayIST();

  const [digest, logsRes] = await Promise.all([
    buildTodayDigest(supabase, today),
    supabase.from("reminder_logs").select("*").order("reminder_date", { ascending: false }).limit(30),
  ]);
  if (logsRes.error) throw new Error(logsRes.error.message);
  const logs = (logsRes.data ?? []) as ReminderLog[];
  const todayLog = logs.find((l) => l.reminder_date === today);
  const configured = isTelegramConfigured();
  const cronReady = Boolean(env.cronSecret && env.cronSecret.length >= 16);

  return (
    <>
      <PageHeader title="Telegram reminders" description="A digest of due and overdue fees is sent to the admin every day at 8:00 AM IST." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card title="Status">
            <dl className="divide-y divide-slate-100 text-sm">
              <StatusRow label="Telegram bot" ok={configured} okText="Configured" badText="Not configured" />
              <StatusRow label="Cron secret" ok={cronReady} okText="Configured" badText="Missing / too short" />
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-slate-500">Today ({formatDate(today)})</dt>
                <dd>
                  {todayLog ? (
                    <LogBadge status={todayLog.status} />
                  ) : (
                    <Badge>Not sent yet</Badge>
                  )}
                </dd>
              </div>
              <div className="px-4 py-3 text-xs text-slate-500">
                Schedule: 08:00 IST daily (02:30 UTC), with an automatic retry at 09:00 IST if the first attempt failed. A reminder is never sent twice for the same day unless you choose “Send again”.
              </div>
            </dl>
          </Card>

          {!configured ? (
            <Alert tone="warning">
              Set <code>TELEGRAM_BOT_TOKEN</code> and <code>TELEGRAM_CHAT_ID</code> in the server environment (Vercel project settings), then redeploy.
            </Alert>
          ) : null}

          <Card title="Send manually">
            <div className="p-4">
              <ReminderControls alreadySent={todayLog?.status === "sent"} />
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title={`Preview — ${formatLongDate(today)}`}>
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 text-center text-sm">
              <div className="p-3">
                <p className="text-xs text-slate-500">Due today</p>
                <p className="font-semibold">{formatINR(digest.dueTodayTotal)}</p>
              </div>
              <div className="p-3">
                <p className="text-xs text-slate-500">Overdue</p>
                <p className="font-semibold text-red-600">{formatINR(digest.overdueTotal)}</p>
              </div>
              <div className="p-3">
                <p className="text-xs text-slate-500">Expected</p>
                <p className="font-semibold text-emerald-700">{formatINR(digest.totalExpected)}</p>
              </div>
            </div>
            <pre className="max-h-[28rem] overflow-auto p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
              {telegramHtmlToText(digest.text)}
            </pre>
          </Card>

          <Card title="History">
            {logs.length === 0 ? (
              <EmptyState title="No reminders sent yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Trigger</th>
                      <th className="text-right">Due today</th>
                      <th className="text-right">Overdue</th>
                      <th className="text-right">Expected</th>
                      <th>Sent at</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td>{formatDate(l.reminder_date)}</td>
                        <td>
                          <LogBadge status={l.status} />
                          {l.error ? (
                            <div className="max-w-56 truncate text-xs text-red-600" title={l.error}>
                              {l.error}
                            </div>
                          ) : null}
                        </td>
                        <td className="capitalize">
                          {l.triggered_by}
                          {l.attempts > 1 ? <span className="text-xs text-slate-400"> ×{l.attempts}</span> : null}
                        </td>
                        <td className="text-right">{l.due_today_count ?? "—"}</td>
                        <td className="text-right">{l.overdue_count ?? "—"}</td>
                        <td className="text-right">{l.total_expected != null ? formatINR(l.total_expected) : "—"}</td>
                        <td>{formatDateTime(l.sent_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function StatusRow({ label, ok, okText, badText }: { label: string; ok: boolean; okText: string; badText: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd>{ok ? <Badge tone="green">{okText}</Badge> : <Badge tone="red">{badText}</Badge>}</dd>
    </div>
  );
}

function LogBadge({ status }: { status: ReminderLog["status"] }) {
  if (status === "sent") return <Badge tone="green">Sent</Badge>;
  if (status === "failed") return <Badge tone="red">Failed</Badge>;
  return <Badge tone="amber">Sending</Badge>;
}
