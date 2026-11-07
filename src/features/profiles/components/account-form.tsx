"use client";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { useActionForm } from "@/hooks/use-action-form";
import { updateAccount } from "../actions";
import { accountSchema, type AccountInput } from "../schemas";

const COMMON_TIMEZONES = [
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

export function AccountForm({ defaultValues }: { defaultValues: AccountInput }) {
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({ schema: accountSchema, action: updateAccount, defaultValues });
  const zones = COMMON_TIMEZONES.includes(defaultValues.timezone) ? COMMON_TIMEZONES : [defaultValues.timezone, ...COMMON_TIMEZONES];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" error={errorOf("name")}>
          {(a) => <Input {...a} {...form.register("name")} />}
        </Field>
        <Field label="Timezone" error={errorOf("timezone")} hint="Used for dates in reports">
          {(a) => <Select options={zones.map((z) => ({ value: z, label: z }))} {...a} {...form.register("timezone")} />}
        </Field>
      </div>
      <StatusMessage status={status} />
      <Button type="submit" variant="secondary" loading={isSubmitting}>
        Save account
      </Button>
    </form>
  );
}
