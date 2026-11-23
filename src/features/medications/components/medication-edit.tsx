"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { EditDialogButton } from "@/components/edit-dialog-button";
import { Button } from "@/components/ui/button";
import { ComboInput } from "@/components/ui/combo-input";
import { DatePicker, toYmd } from "@/components/ui/date-picker";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { TagInput } from "@/components/ui/tag-input";
import { COMMON_CONDITIONS, splitConditions } from "@/domain/conditions";
import { DOSAGE_FORMS, MEAL_TIMING_TEXT, MEAL_TIMINGS, SCHEDULE_PRESETS, STRENGTH_PRESETS, type MedicationMealTiming } from "@/domain/medication";
import { optionalString, useActionForm } from "@/hooks/use-action-form";
import { updateMedication, updatePrescription } from "../actions";
import { updateMedicationSchema, updatePrescriptionSchema } from "../schemas";
import { DurationField } from "./duration-field";
import { MedicineNameInput, type CatalogMatch } from "./medicine-name-input";

/** A saved medicine as plain values (dates as YYYY-MM-DD), for the edit form. */
export interface EditableMedication {
  id: string;
  name: string;
  form: string | null;
  generic: string | null;
  dosage: string;
  schedule: string;
  mealTiming: string | null;
  notes: string | null;
  startDate: string | null;
  durationDays: number | null;
}

export interface EditablePrescription {
  id: string;
  doctorName: string | null;
  doctorSpecialty: string | null;
  issuedOn: string | null;
  condition: string | null;
}

const MEAL_OPTIONS = MEAL_TIMINGS.map((m) => ({ value: m, label: MEAL_TIMING_TEXT[m] }));
const SPECIALTIES = ["Medicine", "Cardiologist", "Diabetologist / Endocrinologist", "Nephrologist", "Neurologist", "Gastroenterologist", "General practitioner"];

export function MedicationEditButton({ medication }: { medication: EditableMedication }) {
  return (
    <EditDialogButton title={`Edit ${medication.name}`} label={`Edit ${medication.name}`}>
      {(close) => <MedicationEditForm medication={medication} onDone={close} />}
    </EditDialogButton>
  );
}

function MedicationEditForm({ medication: m, onDone }: { medication: EditableMedication; onDone: () => void }) {
  const [strengths, setStrengths] = useState<string[]>([]);
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: updateMedicationSchema,
    action: updateMedication,
    defaultValues: {
      id: m.id,
      name: m.name,
      form: m.form ?? undefined,
      generic: m.generic ?? undefined,
      dosage: m.dosage || undefined,
      schedule: m.schedule,
      mealTiming: (m.mealTiming as MedicationMealTiming | null) ?? undefined,
      notes: m.notes ?? undefined,
      startDate: m.startDate ?? undefined,
      durationDays: m.durationDays,
    },
    onSuccess: onDone,
  });
  const { register, control, setValue, watch } = form;
  const [formValue, generic] = watch(["form", "generic"]);
  const formOptions = [...new Set([...(formValue ? [formValue] : []), ...DOSAGE_FORMS])].map((f) => ({ value: f, label: f }));

  function pickCatalog(c: CatalogMatch) {
    setValue("name", c.brand, { shouldValidate: true });
    setValue("generic", c.generic);
    setValue("form", c.form);
    setStrengths(c.strengths);
    if (c.strengths.length === 1) setValue("dosage", c.strengths[0]);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Medicine name" error={errorOf("name")} hint={generic ? `Generic: ${generic}` : undefined} className="col-span-2">
          {(a) => (
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <MedicineNameInput
                  name={field.name}
                  value={field.value ?? ""}
                  onChange={(v) => {
                    field.onChange(v);
                    setValue("generic", undefined);
                    setStrengths([]);
                  }}
                  onPick={pickCatalog}
                  inputProps={a}
                />
              )}
            />
          )}
        </Field>
        <Field label="Type">{(a) => <Select {...a} placeholder="Choose" options={formOptions} {...register("form", optionalString)} />}</Field>
        <Field label="Strength" error={errorOf("dosage")}>
          {(a) => (
            <Controller
              control={control}
              name="dosage"
              render={({ field }) => (
                <ComboInput {...a} name={field.name} mono value={field.value ?? ""} onChange={(v) => field.onChange(v || undefined)} options={strengths.length ? strengths : STRENGTH_PRESETS} placeholder="e.g. 5 mg" />
              )}
            />
          )}
        </Field>
        <Field label="Schedule" error={errorOf("schedule")}>
          {(a) => (
            <Controller
              control={control}
              name="schedule"
              render={({ field }) => <ComboInput {...a} name={field.name} mono value={field.value ?? ""} onChange={field.onChange} options={SCHEDULE_PRESETS} placeholder="e.g. 1+0+1" />}
            />
          )}
        </Field>
        <Field label="With food">{(a) => <Select {...a} placeholder="—" options={MEAL_OPTIONS} {...register("mealTiming", optionalString)} />}</Field>
        <Field label="Started on" error={errorOf("startDate")}>
          {(a) => (
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => <DatePicker {...a} value={field.value ?? ""} onChange={(v) => field.onChange(v || undefined)} max={toYmd(new Date())} />}
            />
          )}
        </Field>
        <Field label="For how long" error={errorOf("durationDays")}>
          {(a) => (
            <Controller control={control} name="durationDays" render={({ field }) => <DurationField value={field.value} onChange={field.onChange} inputProps={a} />} />
          )}
        </Field>
        <Field label="Notes (optional)" error={errorOf("notes")} className="col-span-2 sm:col-span-3">
          {(a) => <Input {...a} placeholder="e.g. 2 tablets each time" {...register("notes", optionalString)} />}
        </Field>
      </div>
      <StatusMessage status={status} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSubmitting}>
          Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function PrescriptionEditButton({ prescription, conditions }: { prescription: EditablePrescription; conditions: string[] }) {
  return (
    <EditDialogButton title="Edit prescription" label="Edit doctor details" text="Edit">
      {(close) => <PrescriptionEditForm prescription={prescription} conditions={conditions} onDone={close} />}
    </EditDialogButton>
  );
}

function PrescriptionEditForm({ prescription: p, conditions, onDone }: { prescription: EditablePrescription; conditions: string[]; onDone: () => void }) {
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: updatePrescriptionSchema,
    action: updatePrescription,
    defaultValues: {
      id: p.id,
      doctorName: p.doctorName ?? undefined,
      doctorSpecialty: p.doctorSpecialty ?? undefined,
      issuedOn: p.issuedOn ?? undefined,
      condition: p.condition ?? undefined,
    },
    onSuccess: onDone,
  });
  const { register, control } = form;
  const suggestions = [...new Set([...conditions, ...COMMON_CONDITIONS])];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Doctor" error={errorOf("doctorName")}>
          {(a) => <Input placeholder="Dr. ..." {...a} {...register("doctorName", optionalString)} />}
        </Field>
        <Field label="Speciality" error={errorOf("doctorSpecialty")}>
          {(a) => (
            <Controller
              control={control}
              name="doctorSpecialty"
              render={({ field }) => <ComboInput {...a} name={field.name} value={field.value ?? ""} onChange={(v) => field.onChange(v || undefined)} options={SPECIALTIES} placeholder="Choose or type" />}
            />
          )}
        </Field>
        <Field label="Prescription date" error={errorOf("issuedOn")} hint="Medicine start dates stay as they are; change them on each medicine if needed.">
          {(a) => (
            <Controller
              control={control}
              name="issuedOn"
              render={({ field }) => <DatePicker {...a} value={field.value ?? ""} onChange={(v) => field.onChange(v || undefined)} max={toYmd(new Date())} clearable />}
            />
          )}
        </Field>
        <Field label="For which conditions" error={errorOf("condition")}>
          {(a) => (
            <Controller
              control={control}
              name="condition"
              render={({ field }) => (
                <TagInput {...a} value={splitConditions(field.value)} onChange={(tags) => field.onChange(tags.length ? tags.join(", ") : undefined)} suggestions={suggestions} placeholder="e.g. Hypertension" />
              )}
            />
          )}
        </Field>
      </div>
      <StatusMessage status={status} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSubmitting}>
          Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
