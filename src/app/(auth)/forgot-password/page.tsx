import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/account-recovery-forms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="eyebrow mb-3">Password reset</p>
      <h1 className="mb-2 font-display text-[38px] leading-none tracking-[-0.03em] text-ink">Forgot it? Happens.</h1>
      <p className="mb-8 text-[15px] text-ink-2">Enter your account email and we&apos;ll send a 6-digit code to set a new password.</p>
      <ForgotPasswordForm />
    </>
  );
}
