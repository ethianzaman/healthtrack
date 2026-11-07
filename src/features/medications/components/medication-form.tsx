"use client";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form-controls";
import { optionalString, useActionForm } from "@/hooks/use-action-form";
import { addMedication } from "../actions";
import { medicationSchema } from "../schemas";

export function MedicationForm() {
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: medicationSchema,
    action: addMedication,
    defaultValues: { name: "", dosage: "", schedule: "" },
    resetOnSuccess: true,
  });
  const { register } = form;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Medicine name" error={errorOf("name")}>
          {(a) => <Input placeholder="e.g. Amlodipine" {...a} {...register("name")} />}
        </Field>
        <Field label="Dosage" error={errorOf("dosage")}>
          {(a) => <Input placeholder="e.g. 5 mg" {...a} {...register("dosage")} />}
        </Field>
        <Field label="Schedule" error={errorOf("schedule")}>
          {(a) => <Input placeholder="e.g. 1+0+1 after meal" {...a} {...register("schedule")} />}
        </Field>
        <Field label="Notes (optional)" error={errorOf("notes")}>
          {(a) => <Input placeholder="e.g. prescribed by Dr. Rahman" {...a} {...register("notes", optionalString)} />}
        </Field>
      </div>
      <StatusMessage status={status} />
      <Button type="submit" loading={isSubmitting}>
        Add medication
      </Button>
    </form>
  );
}
