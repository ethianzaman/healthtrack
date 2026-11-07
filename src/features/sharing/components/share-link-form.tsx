"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { useActionForm } from "@/hooks/use-action-form";
import { createShareLink } from "../actions";
import { SHARE_EXPIRY_OPTIONS, shareLinkSchema } from "../schemas";

const expiryOptions = SHARE_EXPIRY_OPTIONS.map((d) => ({ value: d, label: d === 1 ? "24 hours" : `${d} days` }));

export function ShareLinkForm() {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: shareLinkSchema,
    action: createShareLink,
    defaultValues: { label: "", expiresInDays: 7 },
    resetOnSuccess: true,
    onSuccess: (data) => {
      setUrl(data.url);
      setCopied(false);
    },
  });

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <Field label="Who is this for?" error={errorOf("label")}>
          {(a) => <Input placeholder="e.g. Dr. Rahman (cardiologist)" {...a} {...form.register("label")} />}
        </Field>
        <Field label="Expires in" error={errorOf("expiresInDays")}>
          {(a) => <Select options={expiryOptions} {...a} {...form.register("expiresInDays", { valueAsNumber: true })} />}
        </Field>
        <Button type="submit" loading={isSubmitting}>
          Create link
        </Button>
      </form>
      <StatusMessage status={status} />
      {url ? (
        <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft p-2">
          <code className="min-w-0 flex-1 truncate px-2 text-sm text-accent-ink">{url}</code>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
