/**
 * Usage events shown in the admin panel. They describe what someone did and when,
 * never what they recorded: no readings, medicines or diagnoses are ever attached.
 */
export const ACTIVITY_TYPES = [
  "REGISTER",
  "LOGIN",
  "LOGIN_FAILED",
  "LOGIN_BLOCKED",
  "REPORT_DOWNLOAD",
  "SHARE_CREATED",
  "SHARE_VIEWED",
  "SHARE_REPORT_DOWNLOAD",
  "PRESCRIPTION_SAVED",
  "LAB_REPORT_SAVED",
  "EMAIL_VERIFIED",
  "PASSWORD_RESET",
  "WARNING_RESPONDED",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  REGISTER: "Signed up",
  LOGIN: "Signed in",
  LOGIN_FAILED: "Wrong password",
  LOGIN_BLOCKED: "Sign-in blocked (suspended)",
  REPORT_DOWNLOAD: "Downloaded a report",
  SHARE_CREATED: "Created a doctor link",
  SHARE_VIEWED: "Doctor opened a shared link",
  SHARE_REPORT_DOWNLOAD: "Doctor downloaded a report",
  PRESCRIPTION_SAVED: "Saved medicines",
  LAB_REPORT_SAVED: "Added a test report",
  EMAIL_VERIFIED: "Confirmed email",
  PASSWORD_RESET: "Reset password",
  WARNING_RESPONDED: "Responded to a warning",
};

/** Comma-separated ADMIN_EMAILS -> normalised set. Admin rights live in config, not in the database. */
export function parseAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      // Tolerate values pasted with quotes or separated by spaces/semicolons in the Vercel dashboard.
      .split(/[,;\s]+/)
      .map((e) => e.replace(/["'`]/g, "").trim().toLowerCase())
      .filter((e) => e.includes("@")),
  );
}
