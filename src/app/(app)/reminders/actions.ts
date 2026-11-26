"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/date";
import { env } from "@/lib/env";
import { runDailyReminder } from "@/lib/reminders/run";
import { escapeHtml } from "@/lib/reminders/digest";
import { isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram";
import type { ActionState } from "@/lib/types";

export async function sendReminderNow(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const force = formData.get("force") === "1";
  // Uses the admin's own session: claim/finish functions check is_admin().
  const result = await runDailyReminder(supabase, { triggeredBy: "manual", force });
  revalidatePath("/reminders");

  if (result.status === "sent") {
    return { ok: true, message: `Reminder sent: ${result.dueToday} due today, ${result.overdue} overdue.` };
  }
  if (result.status === "skipped") {
    return { ok: false, message: `${result.reason} Use “Send again” if you really want a second copy.` };
  }
  return { ok: false, message: `Failed: ${result.error}` };
}

export async function sendTestMessage(): Promise<ActionState> {
  await requireAdmin();
  if (!isTelegramConfigured()) return { ok: false, message: "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID first." };
  try {
    await sendTelegramMessage(
      `✅ <b>Test message</b>\nTelegram notifications for <b>${escapeHtml(env.institute.name)}</b> are working.\n<i>${escapeHtml(formatDateTime(new Date().toISOString()))} IST</i>`,
    );
    return { ok: true, message: "Test message sent. Check Telegram." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to send test message." };
  }
}
