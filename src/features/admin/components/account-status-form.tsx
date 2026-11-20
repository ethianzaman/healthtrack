"use client";

import { useState, useTransition } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { StatusMessage, type FormStatus } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/form-controls";
import { optionalString, useActionForm } from "@/hooks/use-action-form";
import type { ActionResult } from "@/lib/action-result";
import { cancelDeletion, reactivateUser, scheduleDeletion, suspendUser, warnUser } from "../actions";
import { reactivateUserSchema, suspendUserSchema, warnUserSchema } from "../schemas";

type Done = ActionResult<{ message: string }>;

function confirmOr(e: React.FormEvent, text: string) {
  if (!window.confirm(text)) {
    e.preventDefault();
    return false;
  }
  return true;
}

export function WarnForm({ userId }: { userId: string }) {
  const { form, onSubmit, status, setStatus, errorOf, isSubmitting } = useActionForm({
    schema: warnUserSchema,
    action: warnUser,
    defaultValues: { userId, reason: "" },
    onSuccess: ({ message }) => setStatus({ type: "success", message }),
  });
  return (
    <form onSubmit={(e) => confirmOr(e, "Send this warning? The user gets an email and 14 days to respond.") && onSubmit(e)} noValidate className="space-y-3">
      <Field label="Warning reason (emailed to the user)" error={errorOf("reason")}>
        {(a) => <Textarea rows={3} placeholder="e.g. Several accounts were created from this email for spam" {...a} {...form.register("reason")} />}
      </Field>
      <StatusMessage status={status} />
      <Button type="submit" variant="secondary" loading={isSubmitting}>
        Send warning (14 days to respond)
      </Button>
    </form>
  );
}

export function SuspendForm({ userId }: { userId: string }) {
  const { form, onSubmit, status, setStatus, errorOf, isSubmitting } = useActionForm({
    schema: suspendUserSchema,
    action: suspendUser,
    defaultValues: { userId, reason: "", scheduleDeletion: false },
    onSuccess: ({ message }) => setStatus({ type: "success", message }),
  });
  return (
    <form onSubmit={(e) => confirmOr(e, "Suspend this account? The user is signed out immediately.") && onSubmit(e)} noValidate className="space-y-3">
      <Field label="Suspension reason (kept in the audit log)" error={errorOf("reason")}>
        {(a) => <Textarea rows={3} placeholder="e.g. Abusive use of doctor links" {...a} {...form.register("reason")} />}
      </Field>
      <label className="flex items-start gap-2 text-[13px] text-ink-2">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-accent" {...form.register("scheduleDeletion")} />
        <span>Also delete the account in 30 days (the user is emailed the reason, the date and a copy of their data)</span>
      </label>
      <StatusMessage status={status} />
      <Button type="submit" variant="danger" loading={isSubmitting}>
        Suspend account
      </Button>
    </form>
  );
}

export function ReactivateForm({ userId }: { userId: string }) {
  const { form, onSubmit, status, setStatus, errorOf, isSubmitting } = useActionForm({
    schema: reactivateUserSchema,
    action: reactivateUser,
    defaultValues: { userId },
    onSuccess: ({ message }) => setStatus({ type: "success", message }),
  });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <Field label="Note (optional)" error={errorOf("reason")}>
        {(a) => <Textarea rows={2} placeholder="e.g. User replied, issue resolved" {...a} {...form.register("reason", optionalString)} />}
      </Field>
      <StatusMessage status={status} />
      <Button type="submit" loading={isSubmitting}>
        Reactivate account
      </Button>
    </form>
  );
}

/** One-click admin action with confirmation (schedule / cancel deletion). */
function QuickAction({ run, label, confirm, variant }: { run: () => Promise<Done>; label: string; confirm: string; variant: ButtonVariant }) {
  const [status, setStatus] = useState<FormStatus>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        size="sm"
        loading={pending}
        onClick={() => {
          if (!window.confirm(confirm)) return;
          start(async () => {
            const r = await run();
            setStatus(r.ok ? { type: "success", message: r.data.message } : { type: "error", message: r.error });
          });
        }}
      >
        {label}
      </Button>
      <StatusMessage status={status} />
    </div>
  );
}

export function DeletionControls({ userId, scheduled }: { userId: string; scheduled: boolean }) {
  return scheduled ? (
    <QuickAction run={() => cancelDeletion({ userId })} label="Cancel scheduled deletion" confirm="Cancel the scheduled deletion?" variant="secondary" />
  ) : (
    <QuickAction
      run={() => scheduleDeletion({ userId })}
      label="Delete in 30 days"
      confirm="Schedule permanent deletion in 30 days? The user is emailed now with a copy of their data."
      variant="danger"
    />
  );
}
