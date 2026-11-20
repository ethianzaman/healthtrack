"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { StatusMessage, type FormStatus } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form-controls";
import { useActionForm } from "@/hooks/use-action-form";
import { forgotPasswordAction, resendVerificationAction, resetPasswordAction, verifyEmailAction } from "../actions";
import { forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from "../schemas";

const RESEND_SECONDS = 60;

/** Props for a one-time-code input: numeric keypad on phones and autofill from the SMS/email suggestion bar. */
const codeInputProps = {
  inputMode: "numeric" as const,
  autoComplete: "one-time-code",
  maxLength: 7,
  placeholder: "123456",
  className: "font-mono text-center text-[22px] tracking-[0.4em]",
};

function useCountdown(initial: number) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

export function VerifyEmailForm({ resendIn }: { resendIn: number }) {
  const router = useRouter();
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: verifyEmailSchema,
    action: verifyEmailAction,
    defaultValues: { code: "" },
    onSuccess: () => router.replace("/dashboard"),
  });
  const [left, setLeft] = useCountdown(resendIn);
  const [resendStatus, setResendStatus] = useState<FormStatus>(null);
  const [resending, startResend] = useTransition();

  function resend() {
    startResend(async () => {
      const result = await resendVerificationAction({});
      setResendStatus(result.ok ? { type: "success", message: result.message ?? "Code sent." } : { type: "error", message: result.error });
      if (result.ok) setLeft(RESEND_SECONDS);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="6-digit code" error={errorOf("code")} hint="The code expires 3 minutes after it is sent.">
        {(a) => <Input autoFocus {...codeInputProps} {...a} {...form.register("code")} />}
      </Field>
      <StatusMessage status={status ?? resendStatus} />
      <Button type="submit" loading={isSubmitting} className="w-full">
        Confirm email
      </Button>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-3">Didn&apos;t get it?</span>
        <Button type="button" variant="ghost" size="sm" onClick={resend} disabled={left > 0} loading={resending}>
          {left > 0 ? `Resend in ${left}s` : "Send a new code"}
        </Button>
      </div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: forgotPasswordSchema,
    action: forgotPasswordAction,
    defaultValues: { email: "" },
    onSuccess: ({ email }) => router.push(`/reset-password?email=${encodeURIComponent(email)}`),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" error={errorOf("email")}>
        {(a) => <Input type="email" autoComplete="email" autoFocus {...a} {...form.register("email")} />}
      </Field>
      <StatusMessage status={status} />
      <Button type="submit" loading={isSubmitting} className="w-full">
        Send reset code
      </Button>
      <p className="text-center text-sm text-ink-3">
        Remembered it?{" "}
        <Link href="/login" className="inline-block py-2 font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: resetPasswordSchema,
    action: resetPasswordAction,
    defaultValues: { email, code: "", password: "" },
    onSuccess: () => router.replace("/dashboard"),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" error={errorOf("email")}>
        {(a) => <Input type="email" autoComplete="email" {...a} {...form.register("email")} />}
      </Field>
      <Field label="6-digit code from the email" error={errorOf("code")} hint="Expires 3 minutes after it is sent.">
        {(a) => <Input autoFocus={Boolean(email)} {...codeInputProps} {...a} {...form.register("code")} />}
      </Field>
      <Field label="New password" error={errorOf("password")} hint="8+ characters with a letter and a number">
        {(a) => <Input type="password" autoComplete="new-password" {...a} {...form.register("password")} />}
      </Field>
      <StatusMessage status={status} />
      <Button type="submit" loading={isSubmitting} className="w-full">
        Set new password
      </Button>
      <p className="text-center text-sm text-ink-3">
        Code expired?{" "}
        <Link href="/forgot-password" className="inline-block py-2 font-medium text-accent hover:underline">
          Send a new one
        </Link>
      </p>
    </form>
  );
}
