"use client";

import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { DatePicker, toYmd } from "@/components/ui/date-picker";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { COMMON_CONDITIONS, CONDITION_STATUS_TEXT, CONDITION_STATUSES } from "@/domain/conditions";
import { optionalString, useActionForm } from "@/hooks/use-action-form";
import { saveCondition } from "../actions";
import { conditionSchema, type ConditionInput } from "../schemas";

/** Add a condition, or edit one when `initial.id` is set. */
export function ConditionForm({ initial, onDone, onCancel }: { initial?: Partial<ConditionInput>; onDone?: () => void; onCancel?: () => void }) {
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: conditionSchema,
    action: saveCondition,
    defaultValues: { status: "ONGOING", name: "", ...initial },
    resetOnSuccess: !initial?.id,
    onSuccess: () => onDone?.(),
  });
  const { register, control, watch } = form;
  const today = toYmd(new Date());

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Condition" error={errorOf("name")}>
          {(a) => (
            <>
              <Input list="condition-names" placeholder="e.g. Hypertension" {...a} {...register("name")} />
              <datalist id="condition-names">
                {COMMON_CONDITIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Status">
          {() => (
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <ChoiceChips label="Status" choices={CONDITION_STATUSES.map((s) => ({ value: s, label: CONDITION_STATUS_TEXT[s] }))} value={field.value} onChange={(v) => v && field.onChange(v)} />
              )}
            />
          )}
        </Field>
        <Field label="Since (diagnosed on)" error={errorOf("diagnosedOn")}>
          {(a) => (
            <Controller
              control={control}
              name="diagnosedOn"
              render={({ field }) => <DatePicker {...a} value={field.value ?? ""} onChange={(v) => field.onChange(v || undefined)} max={today} yearDropdown clearable placeholder="Optional" />}
            />
          )}
        </Field>
        {watch("status") === "RESOLVED" ? (
          <Field label="Resolved on" error={errorOf("resolvedOn")}>
            {(a) => (
              <Controller
                control={control}
                name="resolvedOn"
                render={({ field }) => <DatePicker {...a} value={field.value ?? ""} onChange={(v) => field.onChange(v || undefined)} max={today} yearDropdown clearable placeholder="Today if empty" />}
              />
            )}
          </Field>
        ) : null}
        <Field label="Treating doctor (optional)" error={errorOf("doctorName")}>
          {(a) => <Input placeholder="Dr. ..." {...a} {...register("doctorName", optionalString)} />}
        </Field>
        <Field label="Notes (optional)" error={errorOf("notes")} className="sm:col-span-2">
          {(a) => <Textarea rows={2} placeholder="e.g. found on routine check-up, family history" {...a} {...register("notes", optionalString)} />}
        </Field>
      </div>
      <StatusMessage status={status} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSubmitting}>
          {initial?.id ? "Save changes" : "Add condition"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
