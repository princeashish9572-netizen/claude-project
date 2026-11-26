"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, Bell, CreditCard, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { cn } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/reminders", label: "Reminders", icon: Bell },
];

export function AppShell({
  instituteName,
  adminLabel,
  signOut,
  children,
}: {
  instituteName: string;
  adminLabel: string;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Main">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-white/10 text-white" : "text-indigo-100 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-3">
      <p className="truncate px-3 pb-2 text-xs text-indigo-200" title={adminLabel}>
        {adminLabel}
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-indigo-100 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-5" aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );

  const brand = (
    <div className="flex h-16 items-center gap-3 px-5">
      <span className="grid size-8 place-items-center rounded-lg bg-white/15 text-lg font-bold text-white">₹</span>
      <span className="truncate text-sm font-semibold text-white" title={instituteName}>
        {instituteName}
      </span>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-900 lg:flex print:hidden">
        {brand}
        {nav}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden print:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="-ml-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Open navigation"
          aria-expanded={open}
        >
          <Menu className="size-6" />
        </button>
        <span className="truncate text-sm font-semibold">{instituteName}</span>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-brand-900 shadow-xl">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-indigo-100 hover:bg-white/10" aria-label="Close navigation">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
