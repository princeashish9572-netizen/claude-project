import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { runDailyReminder } from "@/lib/reminders/run";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = env.cronSecret;
  if (!secret || secret.length < 16) return false; // refuse to run with a missing/weak secret
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Invoked by Vercel Cron daily at 02:30 UTC = 08:00 IST (see vercel.json).
 * Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDailyReminder(createServiceClient(), { triggeredBy: "cron" });
  if (result.status === "failed") console.error("Daily reminder failed", result.error);

  return NextResponse.json(result, {
    status: result.status === "failed" ? 500 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
