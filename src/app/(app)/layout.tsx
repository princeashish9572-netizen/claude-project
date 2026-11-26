import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { AppShell } from "@/components/app-shell";
import { signOut } from "@/app/login/actions";

// Every page under (app) is per-admin, always dynamic and never cached.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <AppShell instituteName={env.institute.name} adminLabel={admin.fullName ?? admin.email ?? "Admin"} signOut={signOut}>
      {children}
    </AppShell>
  );
}
