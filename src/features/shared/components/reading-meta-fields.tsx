"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { suggestTimeOfDay, TIME_OF_DAY_LABELS, toOptions, type TimeOfDay } from "@/domain/enums";
import { optionalString } from "@/hooks/use-action-form";

interface ReadingMeta {
  measuredAt: string;
  timeOfDay: TimeOfDay;
  note?: string;
}

/** `YYYY-MM-DDTHH:mm` in the browser's local time, for <input type="datetime-local">. */
export function toLocalInputValue(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Local datetime-input value -> ISO instant (sent to the server). */
export function localInputToIso(value: string) {
  return new Date(value).toISOString();
}

const timeOfDayOptions = toOptions(TIME_OF_DAY_LABELS);

/**
 * Date/time, period-of-day and note fields shared by every reading form.
 * Picks "Morning/Evening..." automatically from the chosen time (user can override).
 */
export function ReadingMetaFields() {
  const { register, setValue, formState } = useFormContext<ReadingMeta>();
  const errors = formState.errors;

  // Set "now" after mount to avoid server/client clock & timezone mismatch.
  useEffect(() => {
    const now = new Date();
    setValue("measuredAt", toLocalInputValue(now));
    setValue("timeOfDay", suggestTimeOfDay(now.getHours()));
  }, [setValue]);

  const measuredAt = register("measuredAt", {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const d = new Date(e.target.value);
      if (!Number.isNaN(d.getTime())) setValue("timeOfDay", suggestTimeOfDay(d.getHours()));
    },
  });

  return (
    <>
      <Field label="Date & time" error={errors.measuredAt?.message}>
        {(a) => <Input type="datetime-local" {...a} {...measuredAt} />}
      </Field>
      <Field label="Time of day" error={errors.timeOfDay?.message}>
        {(a) => <Select options={timeOfDayOptions} {...a} {...register("timeOfDay")} />}
      </Field>
      <Field label="Note (optional)" error={errors.note?.message} className="sm:col-span-2">
        {(a) => <Textarea rows={2} placeholder="e.g. after walk, missed dose, felt dizzy" {...a} {...register("note", optionalString)} />}
      </Field>
    </>
  );
}
