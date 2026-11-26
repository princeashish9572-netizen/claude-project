import "server-only";
import { env } from "@/lib/env";

export const TELEGRAM_MAX_LENGTH = 4096;

export function isTelegramConfigured(): boolean {
  return Boolean(env.telegramBotToken && env.telegramChatId);
}

/** Sends one HTML-formatted message. Throws with a readable error on failure. */
export async function sendTelegramMessage(text: string): Promise<number> {
  const token = env.telegramBotToken;
  const chatId = env.telegramChatId;
  if (!token || !chatId) throw new Error("Telegram is not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).");
  if (text.length > TELEGRAM_MAX_LENGTH) throw new Error("Telegram message too long");

  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${env.telegramApiBase}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    }).catch((e: unknown) => {
      lastError = e instanceof Error ? e.message : String(e);
      return null;
    });

    if (res) {
      const body = (await res.json().catch(() => null)) as
        | { ok: boolean; result?: { message_id: number }; description?: string; parameters?: { retry_after?: number } }
        | null;
      if (res.ok && body?.ok && body.result) return body.result.message_id;
      // Never include the bot token in errors.
      lastError = `Telegram API ${res.status}: ${body?.description ?? "unknown error"}`;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable) break;
      const waitS = Math.min(body?.parameters?.retry_after ?? attempt * 2, 10);
      await new Promise((r) => setTimeout(r, waitS * 1000));
      continue;
    }
    await new Promise((r) => setTimeout(r, attempt * 1000));
  }
  throw new Error(lastError || "Failed to send Telegram message");
}

/** Sends several messages in order (for digests longer than one message). */
export async function sendTelegramMessages(chunks: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const chunk of chunks) {
    ids.push(await sendTelegramMessage(chunk));
    if (chunks.length > 1) await new Promise((r) => setTimeout(r, 350));
  }
  return ids;
}
