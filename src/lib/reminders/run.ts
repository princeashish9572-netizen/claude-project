import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayIST } from "@/lib/date";
import { env } from "@/lib/env";
import { fetchAll } from "@/lib/data/fetch-all";
import { isTelegramConfigured, sendTelegramMessages } from "@/lib/telegram";
import { buildDailyDigest, type Digest, type DigestDue } from "./digest";

export type ReminderRunResult =
  | { status: "sent"; date: string; messages: number; dueToday: number; overdue: number; totalExpected: number }
  | { status: "skipped"; date: string; reason: string }
  | { status: "failed"; date: string; error: string };

/** Open dues (due today or earlier) for active students, as of IST today. */
export async function loadOpenDues(supabase: SupabaseClient, today: string): Promise<DigestDue[]> {
  return fetchAll<DigestDue>((from, to) =>
    supabase
      .from("due_details")
      .select("id, student_id, student_name, student_phone, course, due_date, balance")
      .eq("student_status", "active")
      .gt("balance", 0)
      .lte("due_date", today)
      .order("due_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
}

export async function buildTodayDigest(supabase: SupabaseClient, today = todayIST()): Promise<Digest> {
  const dues = await loadOpenDues(supabase, today);
  return buildDailyDigest(dues, today, { instituteName: env.institute.name, appUrl: env.appUrl });
}

/**
 * Generates due rows, then sends today's digest at most once.
 * De-duplication is enforced in the database: claim_daily_reminder() inserts a
 * unique (date, kind) row atomically, so concurrent or repeated cron
 * invocations cannot both send. A failed attempt can be retried; a sent one
 * is only re-sent when `force` is set by an admin.
 */
export async function runDailyReminder(
  supabase: SupabaseClient,
  opts: { triggeredBy: "cron" | "manual"; force?: boolean },
): Promise<ReminderRunResult> {
  const today = todayIST();

  const gen = await supabase.rpc("generate_all_dues", { p_horizon_days: 45 });
  if (gen.error) return { status: "failed", date: today, error: `Due generation failed: ${gen.error.message}` };

  const claim = await supabase.rpc("claim_daily_reminder", {
    p_date: today,
    p_triggered_by: opts.triggeredBy,
    p_force: Boolean(opts.force),
  });
  if (claim.error) return { status: "failed", date: today, error: `Could not claim reminder: ${claim.error.message}` };
  const logId = claim.data as string | null;
  if (!logId) return { status: "skipped", date: today, reason: "Today's reminder has already been sent." };

  const finish = (args: Record<string, unknown>) => supabase.rpc("finish_daily_reminder", { p_id: logId, ...args });

  try {
    const digest = await buildTodayDigest(supabase, today);
    const summary = {
      p_due_today_count: digest.dueToday.length,
      p_overdue_count: digest.overdue.length,
      p_total_expected: digest.totalExpected,
      p_message: digest.text,
    };

    if (!isTelegramConfigured()) {
      const error = "Telegram is not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).";
      await finish({ p_status: "failed", ...summary, p_error: error });
      return { status: "failed", date: today, error };
    }

    await sendTelegramMessages(digest.chunks);
    const done = await finish({ p_status: "sent", ...summary, p_error: null });
    if (done.error) console.error("finish_daily_reminder failed after sending", done.error.message);

    return {
      status: "sent",
      date: today,
      messages: digest.chunks.length,
      dueToday: digest.dueToday.length,
      overdue: digest.overdue.length,
      totalExpected: digest.totalExpected,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await finish({ p_status: "failed", p_error: error });
    return { status: "failed", date: today, error };
  }
}
