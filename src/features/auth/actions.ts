"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicAction } from "@/server/actions/safe-action";
import { getCurrentUser } from "@/server/auth/context";
import { AppError } from "@/server/errors";
import { authService } from "@/server/services/auth.service";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from "./schemas";

export const loginAction = publicAction(loginSchema, (input) => authService.login(input));

export const registerAction = publicAction(registerSchema, (input) => authService.register(input));

/** The signed-in (possibly unverified) user; verification actions need a session but not a confirmed email. */
async function sessionUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("Your session has ended. Please sign in again.", "UNAUTHORIZED");
  return user;
}

export const verifyEmailAction = publicAction(verifyEmailSchema, async ({ code }) => {
  await authService.verifyEmail(await sessionUser(), code);
  return null;
});

export const resendVerificationAction = publicAction(
  z.object({}),
  async () => {
    await authService.resendVerification(await sessionUser());
    return null;
  },
  { successMessage: "A new code is on its way. Check your inbox (and spam folder)." },
);

export const forgotPasswordAction = publicAction(
  forgotPasswordSchema,
  async ({ email }) => {
    await authService.requestPasswordReset(email);
    return { email };
  },
  { successMessage: "If an account exists for that email, a 6-digit code is on its way." },
);

export const resetPasswordAction = publicAction(resetPasswordSchema, async (input) => {
  await authService.resetPassword(input);
  return null;
});

export async function logoutAction() {
  await authService.logout();
  redirect("/login");
}
