import "server-only";
import { getEnv } from "@/config/env";
import { sendMail } from "@/server/mail/mailer";
import { resetPasswordCode, verifyEmailCode } from "@/server/mail/templates";
import { AppError } from "@/server/errors";
import { otpRepository } from "@/server/repositories/otp.repository";
import {
  generateOtp,
  hashOtp,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_PER_HOUR,
  OTP_RESEND_COOLDOWN_SECONDS,
  otpExpiry,
  otpMatches,
  type OtpPurpose,
} from "@/server/security/otp";

const TEMPLATES = { VERIFY_EMAIL: verifyEmailCode, RESET_PASSWORD: resetPasswordCode } as const;

export const otpService = {
  /** Seconds until another code may be requested (0 = now). Lets the page show the real countdown after a reload. */
  async cooldownLeft(userId: string, purpose: OtpPurpose) {
    const last = await otpRepository.latest(userId, purpose);
    return last ? Math.max(0, OTP_RESEND_COOLDOWN_SECONDS - Math.floor((Date.now() - last.createdAt.getTime()) / 1000)) : 0;
  },

  /** Creates and emails a fresh code. Enforces a resend cooldown and an hourly cap per user. */
  async issue(user: { id: string; email: string; name: string }, purpose: OtpPurpose) {
    const wait = await otpService.cooldownLeft(user.id, purpose);
    if (wait > 0) throw new AppError(`Please wait ${wait}s before asking for another code.`, "RATE_LIMITED");
    if ((await otpRepository.countSince(user.id, purpose, new Date(Date.now() - 3_600_000))) >= OTP_MAX_PER_HOUR) {
      throw new AppError("Too many codes requested. Try again in an hour.", "RATE_LIMITED");
    }

    const code = generateOtp();
    await otpRepository.replace({ userId: user.id, purpose, codeHash: hashOtp(code, user.id, purpose, getEnv().AUTH_SECRET), expiresAt: otpExpiry() });
    await sendMail({ to: user.email, ...TEMPLATES[purpose](user.name, code) });
  },

  /** Checks a code; on success it can't be used again. Errors tell the user what to do next. */
  async verify(userId: string, purpose: OtpPurpose, code: string) {
    const row = await otpRepository.latestActive(userId, purpose);
    if (!row || row.expiresAt.getTime() <= Date.now()) throw new AppError("This code has expired. Ask for a new one.", "BAD_REQUEST");
    if (row.attempts >= OTP_MAX_ATTEMPTS) throw new AppError("Too many wrong tries. Ask for a new code.", "BAD_REQUEST");

    if (!otpMatches(code, row.codeHash, userId, purpose, getEnv().AUTH_SECRET)) {
      const { attempts } = await otpRepository.addAttempt(row.id);
      const left = OTP_MAX_ATTEMPTS - attempts;
      throw new AppError(left > 0 ? `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Ask for a new code.", "BAD_REQUEST");
    }
    await otpRepository.consume(row.id);
  },
};
