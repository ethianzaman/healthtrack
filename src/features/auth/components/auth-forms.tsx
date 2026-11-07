"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form-controls";
import { useActionForm } from "@/hooks/use-action-form";
import { loginAction, registerAction } from "../actions";
import { loginSchema, registerSchema } from "../schemas";

export function LoginForm() {
  const router = useRouter();
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: loginSchema,
    action: loginAction,
    defaultValues: { email: "", password: "" },
    onSuccess: () => router.replace("/dashboard"),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" error={errorOf("email")}>
        {(a) => <Input type="email" autoComplete="email" {...a} {...form.register("email")} />}
      </Field>
      <Field label="Password" error={errorOf("password")}>
        {(a) => <Input type="password" autoComplete="current-password" {...a} {...form.register("password")} />}
      </Field>
      <StatusMessage status={status} />
      <Button type="submit" loading={isSubmitting} className="w-full">
        Sign in
      </Button>
      <p className="text-center text-sm text-ink-3">
        New here?{" "}
        <Link href="/register" className="inline-block py-2 font-medium text-accent hover:underline">
          Create a free account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: registerSchema,
    action: registerAction,
    defaultValues: { name: "", email: "", password: "", timezone: "Asia/Dhaka" },
    onSuccess: () => router.replace("/dashboard"),
  });

  // Capture the browser's timezone so reports show local times.
  useEffect(() => {
    form.setValue("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [form]);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Full name" error={errorOf("name")}>
        {(a) => <Input autoComplete="name" {...a} {...form.register("name")} />}
      </Field>
      <Field label="Email" error={errorOf("email")}>
        {(a) => <Input type="email" autoComplete="email" {...a} {...form.register("email")} />}
      </Field>
      <Field label="Password" error={errorOf("password")} hint="8+ characters with a letter and a number">
        {(a) => <Input type="password" autoComplete="new-password" {...a} {...form.register("password")} />}
      </Field>
      <StatusMessage status={status} />
      <Button type="submit" loading={isSubmitting} className="w-full">
        Create account
      </Button>
      <p className="text-center text-sm text-ink-3">
        Already have an account?{" "}
        <Link href="/login" className="inline-block py-2 font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
