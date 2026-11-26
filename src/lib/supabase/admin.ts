import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client. BYPASSES RLS. Only for trusted server code that has no
 * user session (the cron job). Never import this from a client component —
 * the `server-only` import above makes that a build error.
 */
export function createServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
