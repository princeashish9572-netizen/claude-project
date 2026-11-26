"use client";

import { Alert } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-10">
      <Alert tone="error">
        Something went wrong while loading this page.
        {error.digest ? <span className="block text-xs opacity-70">Reference: {error.digest}</span> : null}
      </Alert>
      <button type="button" onClick={reset} className="btn-primary">
        Try again
      </button>
    </div>
  );
}
