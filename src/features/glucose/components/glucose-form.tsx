"use client";

import { FormProvider } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { GLUCOSE_UNIT_LABELS, MEAL_TIMING_LABELS, toOptions, type GlucoseUnit } from "@/domain/enums";
import { classifyGlucose, fromMgDl, toMgDl, type GlucoseTargets } from "@/domain/glucose";
import type { GlucoseReading } from "@/generated/prisma/client";
import { requiredNumber, useActionForm } from "@/hooks/use-action-form";
import { localInputToIso, ReadingMetaFields, toLocalInputValue } from "@/features/shared/components/reading-meta-fields";
import { addGlucoseReading, updateGlucoseReading } from "../actions";
import { glucoseReadingSchema, type GlucoseReadingInput } from "../schemas";

const mealOptions = toOptions(MEAL_TIMING_LABELS);
const unitOptions = toOptions(GLUCOSE_UNIT_LABELS);

/** The value as shown in the field: 1 decimal for mmol/L, whole number for mg/dL. */
function shownValue(valueMgDl: number, unit: GlucoseUnit) {
  const v = fromMgDl(valueMgDl, unit);
  return unit === "MMOL_L" ? Math.round(v * 10) / 10 : Math.round(v);
}

/** Log a new reading, or (with `reading`) correct an existing one. */
export function GlucoseForm({ unit, targets, reading, onDone }: { unit: GlucoseUnit; targets: GlucoseTargets; reading?: GlucoseReading; onDone?: () => void }) {
  const initialValue = reading ? shownValue(reading.valueMgDl, unit) : undefined;
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: glucoseReadingSchema,
    action: reading ? (v: GlucoseReadingInput) => updateGlucoseReading({ ...v, id: reading.id }) : addGlucoseReading,
    defaultValues: reading
      ? {
          value: initialValue,
          unit,
          mealTiming: reading.mealTiming,
          timeOfDay: reading.timeOfDay,
          measuredAt: toLocalInputValue(new Date(reading.measuredAt)),
          note: reading.note ?? undefined,
        }
      : { unit, mealTiming: "FASTING", timeOfDay: "MORNING", measuredAt: "" },
    transform: (v) => {
      const out = { ...v, measuredAt: localInputToIso(v.measuredAt) };
      // Value left as shown: keep the stored mg/dL exactly instead of re-converting the rounded number.
      if (reading && v.unit === unit && v.value === initialValue) return { ...out, value: reading.valueMgDl, unit: "MG_DL" as const };
      return out;
    },
    resetOnSuccess: reading ? false : (current) => ({ ...current, value: undefined, note: undefined }),
    onSuccess: () => onDone?.(),
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
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
            {reading ? "Save changes" : "Save reading"}
          </Button>
          {reading && onDone ? (
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}
