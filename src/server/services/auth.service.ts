import "server-only";
import { isValidTimeZone } from "@/lib/dates";
import type { LoginInput, RegisterInput, ResetPasswordInput } from "@/features/auth/schemas";
import { hashPassword, needsRehash, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { emailEnabled } from "@/server/mail/mailer";
import { userRepository, type SafeUser } from "@/server/repositories/user.repository";
import { assertRateLimit, resetRateLimit } from "@/server/security/rate-limit";
import { activityService } from "./activity.service";
import { otpService } from "./otp.service";

const LOGIN_LIMIT = { limit: 5, windowMs: 15 * 60_000 };
const RESET_LIMIT = { limit: 5, windowMs: 60 * 60_000 };
const INVALID_CREDENTIALS = "Invalid email or password";
const INVALID_RESET = "That code is wrong or has expired. Ask for a new one.";

const isRateLimited = (error: unknown) => error instanceof AppError && error.code === "RATE_LIMITED";

/** Sends a verification code, ignoring "wait before resending" (the user can resend from the page). */
async function sendVerificationCode(user: Pick<SafeUser, "id" | "email" | "name">) {
  try {
    await otpService.issue(user, "VERIFY_EMAIL");
  } catch (error) {
    if (!isRateLimited(error)) throw error;
  }
}

export const authService = {
  /**
   * Creates the account and signs in. When email is configured the account starts unverified and a
   * 6-digit code is emailed; the app stays locked behind /verify-email until it's entered.
   */
  async register(input: Required<RegisterInput>) {
    assertRateLimit(`register:${input.email}`, LOGIN_LIMIT);
    if (await userRepository.existsByEmail(input.email)) {
      throw new AppError("An account with this email already exists", "CONFLICT");
    }
    const needsVerification = emailEnabled();
    const user = await userRepository.createWithDefaultProfile({
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      timezone: isValidTimeZone(input.timezone) ? input.timezone : "Asia/Dhaka",
      emailVerifiedAt: needsVerification ? null : new Date(),
    });
    await createSession(user.id);
    await Promise.all([
      userRepository.touch(user.id, { lastLoginAt: new Date(), lastActiveAt: new Date() }),
      activityService.track("REGISTER", { userId: user.id }),
    ]);
    if (needsVerification) await sendVerificationCode(user);
    return { needsVerification };
  },

  async login(input: LoginInput) {
    const key = `login:${input.email}`;
    assertRateLimit(key, LOGIN_LIMIT);
    const user = await userRepository.findByEmailWithPassword(input.email);
    // Same message for unknown email and wrong password to prevent account enumeration.
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      if (user) await activityService.track("LOGIN_FAILED", { userId: user.id });
      throw new AppError(INVALID_CREDENTIALS, "UNAUTHORIZED");
    }
    // Checked only after the password, so the message can't be used to probe which emails exist.
    if (user.status === "SUSPENDED") {
      await activityService.track("LOGIN_BLOCKED", { userId: user.id });
      throw new AppError("This account is suspended. Please contact support.", "FORBIDDEN");
    }
    resetRateLimit(key);
    if (needsRehash(user.passwordHash)) await userRepository.setPasswordHash(user.id, await hashPassword(input.password));
    await createSession(user.id);
    await Promise.all([
      userRepository.touch(user.id, { lastLoginAt: new Date(), lastActiveAt: new Date() }),
      activityService.track("LOGIN", { userId: user.id }),
    ]);

    if (!user.emailVerifiedAt) {
      // If email delivery was switched off after sign-up, don't lock the person out.
      if (!emailEnabled()) {
        await userRepository.markEmailVerified(user.id);
        return { needsVerification: false };
      }
      await sendVerificationCode(user);
      return { needsVerification: true };
    }
    return { needsVerification: false };
  },

  async verifyEmail(user: SafeUser, code: string) {
    if (user.emailVerifiedAt) return;
    await otpService.verify(user.id, "VERIFY_EMAIL", code);
    await userRepository.markEmailVerified(user.id);
    await activityService.track("EMAIL_VERIFIED", { userId: user.id });
  },

  resendVerification(user: SafeUser) {
    if (user.emailVerifiedAt) throw new AppError("Your email is already confirmed.", "CONFLICT");
    return otpService.issue(user, "VERIFY_EMAIL");
  },

  /** Always answers the same way, so it can't be used to find out who has an account. */
  async requestPasswordReset(email: string) {
    if (!emailEnabled()) throw new AppError("Password reset by email isn't available yet. Please contact support.", "BAD_REQUEST");
    assertRateLimit(`reset:${email}`, RESET_LIMIT);
    const user = await userRepository.findByEmail(email);
    if (!user || user.status === "SUSPENDED") return;
    try {
      await otpService.issue(user, "RESET_PASSWORD");
    } catch (error) {
      if (!isRateLimited(error)) throw error;
    }
  },

  async resetPassword({ email, code, password }: ResetPasswordInput) {
    assertRateLimit(`reset-verify:${email}`, { limit: 10, windowMs: 60 * 60_000 });
    const user = await userRepository.findByEmail(email);
    if (!user || user.status === "SUSPENDED") throw new AppError(INVALID_RESET, "BAD_REQUEST");
    await otpService.verify(user.id, "RESET_PASSWORD", code);
    await userRepository.setPasswordHash(user.id, await hashPassword(password));
    // Receiving the code proves the email is theirs.
    if (!user.emailVerifiedAt) await userRepository.markEmailVerified(user.id);
    await createSession(user.id);
    await activityService.track("PASSWORD_RESET", { userId: user.id });
  },

  logout: destroySession,
};
