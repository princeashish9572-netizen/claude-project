"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, formToObject, loginSchema, safeRedirectPath } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  // Generic message: never reveal whether the email exists.
  if (error || !data.user) return { ok: false, message: "Invalid email or password." };

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { ok: false, message: "This account is not authorised to access the admin panel." };
  }

  redirect(safeRedirectPath(parsed.data.next));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
