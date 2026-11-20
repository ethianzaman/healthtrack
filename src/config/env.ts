import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_URL: z.url().default("http://localhost:3000"),
  /** Comma-separated emails allowed into /admin. Empty = nobody. */
  ADMIN_EMAILS: z.string().optional(),
  /** Gmail address + 16-character App Password used to send emails (OTP, warnings). */
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** "console" prints emails to the server log instead of sending (local testing). */
  MAIL_TRANSPORT: z.enum(["smtp", "console"]).optional(),
  /** Shown in emails and legal pages; defaults to SMTP_USER. */
  SUPPORT_EMAIL: z.string().optional(),
  /** Vercel sends this as a Bearer token to cron routes. */
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Validated environment, parsed lazily so build steps without secrets don't crash on import. */
export function getEnv(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
    }
    cached = parsed.data;
  }
  return cached;
}
