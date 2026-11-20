import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyEmailForm } from "@/features/auth/components/account-recovery-forms";
import { logoutAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/server/auth/context";
import { otpService } from "@/server/services/otp.service";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/dashboard");
  const wait = await otpService.cooldownLeft(user.id, "VERIFY_EMAIL");

  return (
    <>
      <p className="eyebrow mb-3">One last step</p>
      <h1 className="mb-2 font-display text-[38px] leading-none tracking-[-0.03em] text-ink">Check your email.</h1>
      <p className="mb-8 text-[15px] text-ink-2">
        We sent a 6-digit code to <span className="font-medium text-ink">{user.email}</span>. Enter it below to open your logbook. You
        only do this once.
      </p>
      <VerifyEmailForm resendIn={wait} />
      <form action={logoutAction} className="mt-6 text-center">
        <button type="submit" className="py-2 text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline">
          Wrong email? Use a different account
        </button>
      </form>
    </>
  );
}
