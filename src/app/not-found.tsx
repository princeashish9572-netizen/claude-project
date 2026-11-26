import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link href="/dashboard" className="btn-primary mt-2">
        Go to dashboard
      </Link>
    </div>
  );
}
