"use client";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/form-controls";
import { warningResponseSchema } from "@/features/admin/schemas";
import { useActionForm } from "@/hooks/use-action-form";
import { respondToWarning } from "../actions";

/** Shown on every app page while an account has an open warning. Replying stops the automatic suspension. */
export function WarningBanner({ reason, deadline, responded }: { reason: string; deadline: string; responded: boolean }) {
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: warningResponseSchema,
    action: respondToWarning,
    defaultValues: { response: "" },
  });

  return (
    <section role="alert" className="mb-6 rounded-xl border border-sev-elevated/40 bg-sev-elevated-bg p-4 sm:p-5">
      <p className="eyebrow mb-1 text-sev-elevated!">Action needed on your account</p>
      <p className="text-[15px] text-ink">{reason}</p>
      {responded ? (
        <p className="mt-2 text-[13px] text-ink-2">Thanks - we have your response and will review it. Nothing else is needed from you for now.</p>
      ) : (
        <>
          <p className="mt-2 text-[13px] text-ink-2">
            Please reply before <span className="font-medium text-ink">{deadline}</span>. Without a reply the account is suspended and deleted 30 days
            later. You can download your data any time from Reports.
          </p>
          <form onSubmit={onSubmit} noValidate className="mt-3 space-y-3">
            <Field label="Your response" error={errorOf("response")}>
              {(a) => <Textarea rows={3} className="bg-surface" {...a} {...form.register("response")} />}
            </Field>
            <StatusMessage status={status} />
            <Button type="submit" size="sm" loading={isSubmitting}>
              Send response
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
