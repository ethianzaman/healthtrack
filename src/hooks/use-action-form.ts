"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import type { z } from "zod";
import type { FormStatus } from "@/components/ui/feedback";
import type { ActionResult } from "@/lib/action-result";

interface Options<S extends z.ZodType<FieldValues, FieldValues>, R> {
  schema: S;
  action: (input: z.input<S>) => Promise<ActionResult<R>>;
  defaultValues: DefaultValues<z.input<S>>;
  /** Adjust validated values before sending (e.g. local datetime -> ISO). */
  transform?: (values: z.output<S>) => z.input<S>;
  /** Values to reset to after success; `true` resets to defaults, a function derives them from the submitted values. */
  resetOnSuccess?: boolean | ((current: z.input<S>) => DefaultValues<z.input<S>>);
  onSuccess?: (data: R) => void;
}

/**
 * One hook for every form: client-side Zod validation with the same schema the
 * server uses, server-action call, field-error mapping, status message and refresh.
 */
export function useActionForm<S extends z.ZodType<FieldValues, FieldValues>, R>(options: Options<S, R>) {
  const router = useRouter();
  const [status, setStatus] = useState<FormStatus>(null);
  const form = useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(options.schema as never),
    defaultValues: options.defaultValues,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setStatus(null);
    const payload = options.transform ? options.transform(values) : (values as z.input<S>);
    const result = await options.action(payload);

    if (!result.ok) {
      setStatus({ type: "error", message: result.error });
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) form.setError(field as Path<z.input<S>>, { message: messages[0] });
      }
      return;
    }

    setStatus(result.message ? { type: "success", message: result.message } : null);
    if (options.resetOnSuccess) {
      form.reset(typeof options.resetOnSuccess === "function" ? options.resetOnSuccess(form.getValues()) : options.defaultValues);
    }
    options.onSuccess?.(result.data);
    router.refresh();
  });

  const errorOf = (name: Path<z.input<S>>) => {
    const error = name.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], form.formState.errors);
    return (error as { message?: string } | undefined)?.message;
  };

  return { form, onSubmit, status, setStatus, errorOf, isSubmitting: form.formState.isSubmitting };
}

/** register() options that turn empty inputs into undefined and others into numbers. */
export const optionalNumber = { setValueAs: (v: string) => (v === "" || v == null ? undefined : Number(v)) };
export const requiredNumber = { valueAsNumber: true } as const;
export const optionalString = { setValueAs: (v: string) => (v === "" ? undefined : v) };
