"use client";

import { FormProvider } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { classifyBloodPressure } from "@/domain/blood-pressure";
import { ARM_LABELS, toOptions } from "@/domain/enums";
import { optionalNumber, optionalString, requiredNumber, useActionForm } from "@/hooks/use-action-form";
import { localInputToIso, ReadingMetaFields } from "@/features/shared/components/reading-meta-fields";
import { addBpReading } from "../actions";
import { bpReadingSchema } from "../schemas";

const armOptions = toOptions(ARM_LABELS);

export function BpForm() {
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: bpReadingSchema,
    action: addBpReading,
    defaultValues: { timeOfDay: "MORNING", measuredAt: "" },
    transform: (v) => ({ ...v, measuredAt: localInputToIso(v.measuredAt) }),
    resetOnSuccess: (current) => ({ ...current, systolic: undefined, diastolic: undefined, pulse: undefined, note: undefined }),
  });
  const { register, watch } = form;
  const [sys, dia] = watch(["systolic", "diastolic"]);
  const preview = sys > 0 && dia > 0 ? classifyBloodPressure(sys, dia) : null;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Field label="Systolic" error={errorOf("systolic")}>
            {(a) => <Input type="number" inputMode="numeric" placeholder="120" {...a} {...register("systolic", requiredNumber)} />}
          </Field>
          <Field label="Diastolic" error={errorOf("diastolic")}>
            {(a) => <Input type="number" inputMode="numeric" placeholder="80" {...a} {...register("diastolic", requiredNumber)} />}
          </Field>
          <Field label="Pulse" error={errorOf("pulse")}>
            {(a) => <Input type="number" inputMode="numeric" placeholder="72" {...a} {...register("pulse", optionalNumber)} />}
          </Field>
        </div>

        {preview ? (
          <p className="text-sm text-ink-2">
            Classification: <SeverityBadge severity={preview.severity}>{preview.label}</SeverityBadge>
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <ReadingMetaFields />
          <Field label="Arm (optional)" error={errorOf("arm")}>
            {(a) => <Select options={armOptions} placeholder="Not specified" {...a} {...register("arm", optionalString)} />}
          </Field>
        </div>

        <StatusMessage status={status} />
        <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
          Save reading
        </Button>
      </form>
    </FormProvider>
  );
}
