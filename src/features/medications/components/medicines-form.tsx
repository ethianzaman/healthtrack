"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ComboInput } from "@/components/ui/combo-input";
import { DatePicker, toYmd } from "@/components/ui/date-picker";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { TagInput } from "@/components/ui/tag-input";
import { DurationField } from "./duration-field";
import { COMMON_CONDITIONS, splitConditions } from "@/domain/conditions";
import {
  DOSAGE_FORMS,
  MEAL_TIMING_TEXT,
  MEAL_TIMINGS,
  SCHEDULE_PRESETS,
  STRENGTH_PRESETS,
  sharedIngredients,
} from "@/domain/medication";
import type { PrescriptionDraft } from "@/domain/prescription";
import { optionalString, useActionForm } from "@/hooks/use-action-form";
import { saveMedicines } from "../actions";
import { medicinesSchema, type MedicinesInput } from "../schemas";
import { MedicineNameInput, type CatalogMatch } from "./medicine-name-input";

/** A medicine the person is already taking, for the "same medicine twice" warning. */
export interface CurrentMedicine {
  name: string;
  generic: string | null;
  doctor: string | null;
}

const SPECIALTIES = ["Medicine", "Cardiologist", "Diabetologist / Endocrinologist", "Nephrologist", "Neurologist", "Gastroenterologist", "General practitioner"];
const MEAL_OPTIONS = MEAL_TIMINGS.map((m) => ({ value: m, label: MEAL_TIMING_TEXT[m] }));

const EMPTY_ROW: MedicinesInput["medications"][number] = { name: "", schedule: "", durationDays: null };

function rowsFrom(draft?: PrescriptionDraft): MedicinesInput["medications"] {
  if (!draft?.medications.length) return [EMPTY_ROW];
  return draft.medications.map((m) => ({
    name: m.name,
    dosage: m.dosage || undefined,
    schedule: m.schedule,
    mealTiming: m.mealTiming,
    durationDays: m.durationDays === undefined ? null : m.durationDays,
    form: m.form || undefined,
    generic: m.generic || undefined,
    notes: m.notes || undefined,
  }));
}

/**
 * Add one or many medicines at once, optionally as a doctor's prescription.
 * Used for typing medicines in and for reviewing a scanned prescription.
 */
export function MedicinesForm({
  draft,
  current,
  conditions = [],
  onSaved,
  onCancel,
}: {
  draft?: PrescriptionDraft;
  current: CurrentMedicine[];
  /** Names from the condition list, suggested so the same condition isn't spelled two ways. */
  conditions?: string[];
  onSaved?: (added: number) => void;
  onCancel?: () => void;
}) {
  const { form, onSubmit, status, setStatus, errorOf, isSubmitting } = useActionForm({
    schema: medicinesSchema,
    action: saveMedicines,
    defaultValues: {
      doctorName: draft?.doctorName || undefined,
      doctorSpecialty: draft?.doctorSpecialty || undefined,
      issuedOn: draft?.issuedOn || undefined,
      condition: draft?.condition || undefined,
      medications: rowsFrom(draft),
    },
    resetOnSuccess: !draft,
    onSuccess: ({ added }) => {
      setStatus({ type: "success", message: `${added} ${added === 1 ? "medicine" : "medicines"} saved.` });
      onSaved?.(added);
    },
  });
  const { register, control, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "medications" });
  const conditionSuggestions = [...new Set([...conditions, ...COMMON_CONDITIONS])];

  return (
    <form onSubmit={onSubmit} noValidate className="@container space-y-5">
      {draft ? (
        <p className="rounded-md border border-sev-elevated/30 bg-sev-elevated-bg px-3 py-2 text-[13px] text-ink-2">
          Check every line against the paper prescription. Reading photos, especially handwriting, can get names and doses wrong.
        </p>
      ) : null}

      <fieldset className="grid gap-4 @md:grid-cols-2">
        <legend className="eyebrow mb-2 @md:col-span-2">Prescribed by (optional)</legend>
        <Field label="Doctor" error={errorOf("doctorName")}>
          {(a) => <Input placeholder="Dr. ..." {...a} {...register("doctorName", optionalString)} />}
        </Field>
        <Field label="Speciality" error={errorOf("doctorSpecialty")}>
          {(a) => (
            <Controller
              control={control}
              name="doctorSpecialty"
              render={({ field }) => (
                <ComboInput {...a} name={field.name} value={field.value ?? ""} onChange={(v) => field.onChange(v || undefined)} options={SPECIALTIES} placeholder="Choose or type" />
              )}
            />
          )}
        </Field>
        <Field label="Prescription date" error={errorOf("issuedOn")} hint="Courses are counted from this date (today if empty).">
          {(a) => (
            <Controller
              control={control}
              name="issuedOn"
              render={({ field }) => <DatePicker {...a} value={field.value ?? ""} onChange={(v) => field.onChange(v || undefined)} max={toYmd(new Date())} clearable />}
            />
          )}
        </Field>
        <Field label="For which conditions" error={errorOf("condition")} hint="Pick one or more, or type a new one and press Enter.">
          {(a) => (
            <Controller
              control={control}
              name="condition"
              render={({ field }) => (
                <TagInput
                  {...a}
                  value={splitConditions(field.value)}
                  onChange={(tags) => field.onChange(tags.length ? tags.join(", ") : undefined)}
                  suggestions={conditionSuggestions}
                  placeholder="e.g. Hypertension"
                />
              )}
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="eyebrow mb-2">Medicines ({fields.length})</legend>
        {fields.map((field, i) => (
          <MedicineRow
            key={field.id}
            index={i}
            control={control}
            register={register}
            setValue={setValue}
            errorOf={errorOf}
            current={current}
            canRemove={fields.length > 1}
            onRemove={() => remove(i)}
          />
        ))}
        {errorOf("medications") ? <p className="text-xs text-sev-critical">{errorOf("medications")}</p> : null}
        <Button type="button" variant="secondary" onClick={() => append(EMPTY_ROW)} disabled={fields.length >= 20}>
          <Plus className="h-4 w-4" /> Add another medicine
        </Button>
      </fieldset>

      <StatusMessage status={status} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSubmitting}>
          Save {fields.length} {fields.length === 1 ? "medicine" : "medicines"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Discard
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function MedicineRow({
  index: i,
  control,
  register,
  setValue,
  errorOf,
  current,
  canRemove,
  onRemove,
}: {
  index: number;
  control: Control<MedicinesInput>;
  register: UseFormRegister<MedicinesInput>;
  setValue: UseFormSetValue<MedicinesInput>;
  errorOf: (name: never) => string | undefined;
  current: CurrentMedicine[];
  canRemove: boolean;
  onRemove: () => void;
}) {
  const row = useWatch({ control, name: `medications.${i}` });
  const [strengths, setStrengths] = useState<string[]>([]);
  const err = (f: string) => errorOf(`medications.${i}.${f}` as never);
  const path = <K extends keyof MedicinesInput["medications"][number]>(k: K) => `medications.${i}.${k}` as const;

  function pickCatalog(m: CatalogMatch) {
    setValue(path("name"), m.brand, { shouldValidate: true });
    setValue(path("generic"), m.generic);
    setValue(path("form"), m.form);
    setStrengths(m.strengths);
    if (m.strengths.length === 1) setValue(path("dosage"), m.strengths[0]);
  }

  // Same active ingredient already being taken (e.g. Amdocal vs Camlodin), or the same name.
  const overlaps = row?.generic
    ? current.filter((c) => sharedIngredients(row.generic, [c]).length > 0)
    : current.filter((c) => row?.name && c.name.toLowerCase() === row.name.trim().toLowerCase());
  const uniqueOverlaps = [...new Map(overlaps.map((o) => [o.name, o])).values()];
  const formOptions = [...new Set([...(row?.form ? [row.form] : []), ...DOSAGE_FORMS])].map((f) => ({ value: f, label: f }));

  return (
    <div className="space-y-3 rounded-xl border border-line p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <span className="mt-9 hidden font-mono text-[12px] text-ink-3 @md:block">{String(i + 1).padStart(2, "0")}</span>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 @xl:grid-cols-3">
          <Field label="Medicine name" error={err("name")} hint={row?.generic ? `Generic: ${row.generic}` : undefined} className="col-span-2">
            {(a) => (
              <Controller
                control={control}
                name={path("name")}
                render={({ field }) => (
                  <MedicineNameInput
                    name={field.name}
                    value={field.value ?? ""}
                    onChange={(v) => {
                      field.onChange(v);
                      setValue(path("generic"), undefined); // typed by hand: the catalogue's generic no longer applies
                      setStrengths([]);
                    }}
                    onPick={pickCatalog}
                    inputProps={a}
                  />
                )}
              />
            )}
          </Field>
          <Field label="Type">{(a) => <Select {...a} placeholder="Choose" options={formOptions} {...register(path("form"), optionalString)} />}</Field>
          <Field label="Strength" error={err("dosage")}>
            {(a) => (
              <Controller
                control={control}
                name={path("dosage")}
                render={({ field }) => (
                  <ComboInput
                    {...a}
                    name={field.name}
                    mono
                    value={field.value ?? ""}
                    onChange={(v) => field.onChange(v || undefined)}
                    options={strengths.length ? strengths : STRENGTH_PRESETS}
                    placeholder="e.g. 5 mg"
                  />
                )}
              />
            )}
          </Field>
          <Field label="Schedule" error={err("schedule")}>
            {(a) => (
              <Controller
                control={control}
                name={path("schedule")}
                render={({ field }) => (
                  <ComboInput {...a} name={field.name} mono value={field.value ?? ""} onChange={field.onChange} options={SCHEDULE_PRESETS} placeholder="e.g. 1+0+1" />
                )}
              />
            )}
          </Field>
          <Field label="With food">
            {(a) => <Select {...a} placeholder="—" options={MEAL_OPTIONS} {...register(path("mealTiming"), optionalString)} />}
          </Field>
          <Field label="For how long" error={err("durationDays")}>
            {(a) => (
              <Controller
                control={control}
                name={path("durationDays")}
                render={({ field }) => <DurationField value={field.value} onChange={field.onChange} inputProps={a} />}
              />
            )}
          </Field>
          <Field label="Notes (optional)" error={err("notes")} className="col-span-2">
            {(a) => <Input {...a} placeholder="e.g. 2 tablets each time, stop if dizzy" {...register(path("notes"), optionalString)} />}
          </Field>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove medicine ${i + 1}`}
          className="mt-8 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-sev-critical disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {uniqueOverlaps.length ? (
        <p className="flex items-start gap-2 rounded-md bg-sev-elevated-bg px-3 py-2 text-[13px] text-sev-elevated">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Already taking {uniqueOverlaps.map((o) => `${o.name}${o.generic ? ` (${o.generic})` : ""}${o.doctor ? ` from ${o.doctor}` : ""}`).join(", ")}. Check
            with your doctor that both are meant to be taken.
          </span>
        </p>
      ) : null}
    </div>
  );
}
