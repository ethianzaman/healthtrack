"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form-controls";
import type { PrescriptionDraft } from "@/domain/prescription";
import { optionalString, useActionForm } from "@/hooks/use-action-form";
import { savePrescription } from "../actions";
import { prescriptionSchema } from "../schemas";

const EMPTY_MEDICINE = { name: "", dosage: "", schedule: "", notes: "" };

/** Editable draft of a scanned prescription. Nothing is stored until the user confirms. */
export function PrescriptionReview({
  draft,
  onSaved,
  onCancel,
}: {
  draft: PrescriptionDraft;
  onSaved: (added: number) => void;
  onCancel: () => void;
}) {
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: prescriptionSchema,
    action: savePrescription,
    defaultValues: {
      doctorName: draft.doctorName || undefined,
      issuedOn: draft.issuedOn || undefined,
      condition: draft.condition || undefined,
      medications: draft.medications.length ? draft.medications : [EMPTY_MEDICINE],
    },
    onSuccess: ({ added }) => onSaved(added),
  });
  const { register, control } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "medications" });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <p className="rounded-md border border-sev-elevated/30 bg-sev-elevated-bg px-3 py-2 text-[13px] text-ink-2">
        Check every line against the paper prescription. Reading photos, especially handwriting, can get names and doses wrong.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Condition / diagnosis" error={errorOf("condition")} className="sm:col-span-3" hint="Saved with each medicine, e.g. Hypertension, Type 2 diabetes">
          {(a) => <Input placeholder="What is the treatment for?" {...a} {...register("condition", optionalString)} />}
        </Field>
        <Field label="Doctor" error={errorOf("doctorName")} className="sm:col-span-2">
          {(a) => <Input placeholder="Dr. ..." {...a} {...register("doctorName", optionalString)} />}
        </Field>
        <Field label="Prescription date" error={errorOf("issuedOn")}>
          {(a) => <Input type="date" {...a} {...register("issuedOn", optionalString)} />}
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="eyebrow mb-2">Medicines ({fields.length})</legend>
        {fields.map((field, i) => (
          <div key={field.id} className="rounded-lg border border-line p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.6fr_0.8fr_0.8fr_1.6fr_auto] sm:items-end">
              <Field label={`Medicine ${i + 1}`} error={errorOf(`medications.${i}.name`)} className="col-span-2 sm:col-span-1">
                {(a) => <Input placeholder="e.g. Tab Amdocal" {...a} {...register(`medications.${i}.name`)} />}
              </Field>
              <Field label="Dosage" error={errorOf(`medications.${i}.dosage`)}>
                {(a) => <Input placeholder="5 mg" {...a} {...register(`medications.${i}.dosage`)} />}
              </Field>
              <Field label="Schedule" error={errorOf(`medications.${i}.schedule`)}>
                {(a) => <Input placeholder="1+0+1" {...a} {...register(`medications.${i}.schedule`)} />}
              </Field>
              <Field label="Notes" error={errorOf(`medications.${i}.notes`)} className="col-span-2 sm:col-span-1">
                {(a) => <Input placeholder="e.g. after meal" {...a} {...register(`medications.${i}.notes`, optionalString)} />}
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="col-span-2 h-10 w-full sm:col-span-1 sm:w-10"
                aria-label={`Remove medicine ${i + 1}`}
                onClick={() => remove(i)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sm:hidden">Remove</span>
              </Button>
            </div>
          </div>
        ))}
        {errorOf("medications") ? <p className="text-xs text-sev-critical">{errorOf("medications")}</p> : null}
        <Button type="button" variant="secondary" size="sm" onClick={() => append(EMPTY_MEDICINE)} disabled={fields.length >= 20}>
          <Plus className="h-4 w-4" /> Add a medicine
        </Button>
      </fieldset>

      <StatusMessage status={status} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSubmitting}>
          Save {fields.length} {fields.length === 1 ? "medicine" : "medicines"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Discard
        </Button>
      </div>
    </form>
  );
}
