import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AdminContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Returns the signed-in admin, or null. getUser() validates the JWT with the
 * Supabase Auth server (unlike getSession(), which trusts the cookie).
 * Cached per request.
 */
export const getAdmin = cache(async (): Promise<AdminContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("admins").select("user_id, full_name").eq("user_id", user.id).maybeSingle();
  if (error || !data) return null;

  return { userId: user.id, email: user.email ?? null, fullName: data.full_name ?? null, supabase };
});

/** Use at the top of every protected page, layout and server action. */
export async function requireAdmin(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) redirect("/login?error=unauthorized");
  return admin;
}
