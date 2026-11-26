import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except static assets and the cron endpoint (which has its own
  // bearer-token authentication and no user session).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
