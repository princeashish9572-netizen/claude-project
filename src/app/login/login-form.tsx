"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Alert, FieldError } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, { ok: false });
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className="input" />
        <FieldError errors={state.fieldErrors?.email} />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        <FieldError errors={state.fieldErrors?.password} />
      </div>
      <SubmitButton className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
