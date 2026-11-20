"use client";

import { useEffect } from "react";
import { useController, useFormContext } from "react-hook-form";
import { DatePicker, toYmd } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Field, Select, Textarea } from "@/components/ui/form-controls";
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
  const { register, setValue, formState, control } = useFormContext<ReadingMeta>();
  const errors = formState.errors;
  const { field } = useController({ control, name: "measuredAt" });
  const [datePart = "", timePart = ""] = (field.value ?? "").split("T");

  /** Keeps "YYYY-MM-DDTHH:mm" and re-suggests Morning/Evening... from the hour. */
  function setMeasuredAt(date: string, time: string) {
    field.onChange(`${date}T${time}`);
    const hour = Number(time.slice(0, 2));
    if (time && !Number.isNaN(hour)) setValue("timeOfDay", suggestTimeOfDay(hour));
  }

  // Set "now" after mount to avoid server/client clock & timezone mismatch.
  useEffect(() => {
    const now = new Date();
    setValue("measuredAt", toLocalInputValue(now));
    setValue("timeOfDay", suggestTimeOfDay(now.getHours()));
  }, [setValue]);

  return (
    <>
      <Field label="Date & time" error={errors.measuredAt?.message}>
        {(a) => (
          <div className="flex flex-wrap gap-2">
            <DatePicker className="min-w-[11.5rem] flex-1" id={a.id} aria-invalid={a["aria-invalid"]} aria-describedby={a["aria-describedby"]} value={datePart} max={toYmd(new Date())} onChange={(d) => setMeasuredAt(d, timePart)} />
            <div className="flex flex-1 gap-2 sm:flex-none">
              <TimePicker aria-label="Time" value={timePart} onChange={(t) => setMeasuredAt(datePart, t)} className="min-w-38 flex-1 sm:w-40 sm:flex-none" />
              <button
                type="button"
                onClick={() => {
                  const [d, t] = toLocalInputValue().split("T");
                  setMeasuredAt(d, t);
                }}
                className="h-11 rounded-md border border-line px-3 text-[13px] font-medium text-ink-2 hover:border-line-strong hover:text-ink sm:h-10"
              >
                Now
              </button>
            </div>
          </div>
        )}
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
