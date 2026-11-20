import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/** Emailed one-time codes: 6 digits, valid 3 minutes, 5 tries, then a new code is needed. */
export const OTP_TTL_MINUTES = 3;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_PER_HOUR = 5;

export type OtpPurpose = "VERIFY_EMAIL" | "RESET_PASSWORD";

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Keyed hash bound to the user and purpose, so a stolen DB row can't be replayed elsewhere. */
export function hashOtp(code: string, userId: string, purpose: OtpPurpose, secret: string): string {
  return createHmac("sha256", secret).update(`${purpose}:${userId}:${code}`).digest("hex");
}

export function otpMatches(code: string, storedHash: string, userId: string, purpose: OtpPurpose, secret: string): boolean {
  const a = Buffer.from(hashOtp(code, userId, purpose, secret), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function otpExpiry(now = new Date()): Date {
  return new Date(now.getTime() + OTP_TTL_MINUTES * 60_000);
}
