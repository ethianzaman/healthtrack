import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <p className="eyebrow mb-3">New logbook</p>
      <h1 className="mb-2 font-display text-[38px] leading-none tracking-[-0.03em] text-ink">Start with today.</h1>
      <p className="mb-8 text-[15px] text-ink-2">Free for you and one family member. No card needed.</p>
      <RegisterForm />
    </>
  );
}
