import { describe, expect, it } from "vitest";
import { generateOtp, hashOtp, OTP_TTL_MINUTES, otpExpiry, otpMatches } from "./otp";

describe("otp", () => {
  it("generates 6-digit codes, zero-padded", () => {
    for (let i = 0; i < 200; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it("matches only the same code, user and purpose", () => {
    const hash = hashOtp("012345", "user-1", "VERIFY_EMAIL", "s3cret");
    expect(otpMatches("012345", hash, "user-1", "VERIFY_EMAIL", "s3cret")).toBe(true);
    expect(otpMatches("012346", hash, "user-1", "VERIFY_EMAIL", "s3cret")).toBe(false);
    expect(otpMatches("012345", hash, "user-2", "VERIFY_EMAIL", "s3cret")).toBe(false);
    expect(otpMatches("012345", hash, "user-1", "RESET_PASSWORD", "s3cret")).toBe(false);
    expect(otpMatches("012345", hash, "user-1", "VERIFY_EMAIL", "other")).toBe(false);
  });

  it("expires after 3 minutes", () => {
    expect(OTP_TTL_MINUTES).toBe(3);
    const now = new Date("2026-11-20T10:00:00Z");
    expect(otpExpiry(now).toISOString()).toBe("2026-11-20T10:03:00.000Z");
  });
});
