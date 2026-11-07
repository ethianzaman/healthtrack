"use client";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { GENDER_LABELS, GLUCOSE_UNIT_LABELS, toOptions } from "@/domain/enums";
import { DEFAULT_GLUCOSE_TARGETS } from "@/domain/glucose";
import { optionalString, requiredNumber, useActionForm } from "@/hooks/use-action-form";
import type { ActionResult } from "@/lib/action-result";
import { profileSchema, type ProfileInput } from "../schemas";

const genderOptions = toOptions(GENDER_LABELS);
const unitOptions = toOptions(GLUCOSE_UNIT_LABELS);

export const NEW_PROFILE_DEFAULTS: ProfileInput = {
  name: "",
  relation: "",
  glucoseUnit: "MG_DL",
  bpSystolicTarget: 130,
  bpDiastolicTarget: 80,
  glucoseLow: DEFAULT_GLUCOSE_TARGETS.low,
  glucoseFastingMax: DEFAULT_GLUCOSE_TARGETS.fastingMax,
  glucosePostMealMax: DEFAULT_GLUCOSE_TARGETS.postMealMax,
};

/** Used for both "add family member" and "edit active profile". */
export function ProfileForm({
  action,
  defaultValues = NEW_PROFILE_DEFAULTS,
  submitLabel,
  resetOnSuccess = false,
}: {
  action: (input: ProfileInput) => Promise<ActionResult<unknown>>;
  defaultValues?: ProfileInput;
  submitLabel: string;
  resetOnSuccess?: boolean;
}) {
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: profileSchema,
    action,
    defaultValues,
    resetOnSuccess,
  });
  const { register } = form;
  const num = (name: Parameters<typeof register>[0], label: string, hint?: string) => (
    <Field label={label} error={errorOf(name)} hint={hint}>
      {(a) => <Input type="number" inputMode="numeric" {...a} {...register(name, requiredNumber)} />}
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={errorOf("name")}>
          {(a) => <Input {...a} {...register("name")} />}
        </Field>
        <Field label="Relation" error={errorOf("relation")}>
          {(a) => <Input placeholder="Self, Father, Mother..." {...a} {...register("relation")} />}
        </Field>
        <Field label="Date of birth" error={errorOf("dateOfBirth")}>
          {(a) => <Input type="date" {...a} {...register("dateOfBirth", optionalString)} />}
        </Field>
        <Field label="Gender" error={errorOf("gender")}>
          {(a) => <Select options={genderOptions} placeholder="Prefer not to say" {...a} {...register("gender", optionalString)} />}
        </Field>
        <Field label="Glucose unit" error={errorOf("glucoseUnit")}>
          {(a) => <Select options={unitOptions} {...a} {...register("glucoseUnit")} />}
        </Field>
      </div>

      <fieldset className="rounded-lg border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink-2">Personal targets (ask your doctor)</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {num("bpSystolicTarget", "BP systolic <", "mmHg")}
          {num("bpDiastolicTarget", "BP diastolic <", "mmHg")}
          {num("glucoseLow", "Glucose low <", "mg/dL")}
          {num("glucoseFastingMax", "Fasting max", "mg/dL")}
          {num("glucosePostMealMax", "After meal max", "mg/dL")}
        </div>
      </fieldset>

      <StatusMessage status={status} />
      <Button type="submit" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
