"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/types";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { sendReminderNow, sendTestMessage } from "./actions";

export function ReminderControls({ alreadySent }: { alreadySent: boolean }) {
  const [sendState, sendAction] = useActionState<ActionState, FormData>(sendReminderNow, { ok: false });
  const [testState, testAction] = useActionState<ActionState, FormData>(sendTestMessage, { ok: false });
  const message = sendState.message ? sendState : testState.message ? testState : null;

  return (
    <div className="space-y-3">
      {message ? <Alert tone={message.ok ? "success" : "warning"}>{message.message}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <form action={sendAction}>
          {alreadySent ? <input type="hidden" name="force" value="1" /> : null}
          <SubmitButton
            pendingText="Sending…"
            onClick={(e) => {
              if (alreadySent && !confirm("Today's reminder was already sent. Send another copy?")) e.preventDefault();
            }}
          >
            {alreadySent ? "Send again" : "Send today's reminder now"}
          </SubmitButton>
        </form>
        <form action={testAction}>
          <SubmitButton variant="secondary" pendingText="Sending…">
            Send test message
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
