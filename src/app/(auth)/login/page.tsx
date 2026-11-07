import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <p className="eyebrow mb-3">Sign in</p>
      <h1 className="mb-2 font-display text-[38px] leading-none tracking-[-0.03em] text-ink">Good to see you.</h1>
      <p className="mb-8 text-[15px] text-ink-2">Today&apos;s readings won&apos;t log themselves.</p>
      <LoginForm />
    </>
  );
}
