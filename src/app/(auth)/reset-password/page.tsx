import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/account-recovery-forms";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  return (
    <>
      <p className="eyebrow mb-3">Password reset</p>
      <h1 className="mb-2 font-display text-[38px] leading-none tracking-[-0.03em] text-ink">Choose a new password.</h1>
      <p className="mb-8 text-[15px] text-ink-2">
        If an account exists for that email, we&apos;ve sent it a 6-digit code. Check your inbox and spam folder.
      </p>
      <ResetPasswordForm email={email.slice(0, 200)} />
    </>
  );
}
