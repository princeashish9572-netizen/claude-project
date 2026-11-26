import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/validation";
import { Alert } from "@/components/ui";
import { LoginForm } from "./login-form";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (await getAdmin()) redirect(safeRedirectPath(sp.next));

  // Signed in, but not an admin (e.g. a user created without an admins row).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-white/15 text-2xl font-bold">₹</span>
          <h1 className="text-xl font-semibold">{env.institute.name}</h1>
          <p className="mt-1 text-sm text-indigo-200">Fee management — admin sign in</p>
        </div>
        <div className="card p-6">
          {user ? (
            <div className="space-y-4">
              <Alert tone="warning">
                You are signed in as <strong>{user.email}</strong>, but this account is not an administrator.
              </Alert>
              <form action={signOut}>
                <button className="btn-secondary w-full" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <LoginForm next={sp.next} />
          )}
        </div>
      </div>
    </div>
  );
}
