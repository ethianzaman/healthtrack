"use client";

import { FormProvider } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { GLUCOSE_UNIT_LABELS, MEAL_TIMING_LABELS, toOptions, type GlucoseUnit } from "@/domain/enums";
import { classifyGlucose, toMgDl, type GlucoseTargets } from "@/domain/glucose";
import { requiredNumber, useActionForm } from "@/hooks/use-action-form";
import { localInputToIso, ReadingMetaFields } from "@/features/shared/components/reading-meta-fields";
import { addGlucoseReading } from "../actions";
import { glucoseReadingSchema } from "../schemas";

const mealOptions = toOptions(MEAL_TIMING_LABELS);
const unitOptions = toOptions(GLUCOSE_UNIT_LABELS);

export function GlucoseForm({ unit, targets }: { unit: GlucoseUnit; targets: GlucoseTargets }) {
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: glucoseReadingSchema,
    action: addGlucoseReading,
    defaultValues: { unit, mealTiming: "FASTING", timeOfDay: "MORNING", measuredAt: "" },
    transform: (v) => ({ ...v, measuredAt: localInputToIso(v.measuredAt) }),
    resetOnSuccess: (current) => ({ ...current, value: undefined, note: undefined }),
  });
  const { register, watch } = form;
  const [value, selectedUnit, mealTiming] = watch(["value", "unit", "mealTiming"]);
  const preview = value > 0 ? classifyGlucose(toMgDl(value, selectedUnit), mealTiming, targets) : null;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <Field label="Glucose" error={errorOf("value")}>
            {(a) => (
              <Input
                type="number"
                step={selectedUnit === "MMOL_L" ? "0.1" : "1"}
                inputMode="decimal"
                placeholder={selectedUnit === "MMOL_L" ? "6.5" : "110"}
                {...a}
                {...register("value", requiredNumber)}
              />
            )}
          </Field>
          <Field label="Unit" error={errorOf("unit")}>
            {(a) => <Select options={unitOptions} {...a} {...register("unit")} />}
          </Field>
          <Field label="Meal timing" error={errorOf("mealTiming")} className="col-span-2 sm:col-span-1">
            {(a) => <Select options={mealOptions} {...a} {...register("mealTiming")} />}
          </Field>
        </div>

        {preview ? (
          <p className="text-sm text-ink-2">
            Status: <SeverityBadge severity={preview.severity}>{preview.label}</SeverityBadge>
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <ReadingMetaFields />
        </div>

        <StatusMessage status={status} />
        <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
          Save reading
        </Button>
      </form>
    </FormProvider>
  );
}
