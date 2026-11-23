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
  /**
   * Supabase Storage for test report photos/PDFs (private bucket). Without these, files are kept
   * in the database instead, which works but fills it up faster.
   */
  SUPABASE_URL: z.url().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9_-]{1,62}$/).default("health-files"),
  /** Google Gemini key for reading prescription photos. Without it, photos are read on the device (less accurate). */
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().regex(/^[a-z0-9.-]+$/).default("gemini-2.5-flash"),
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
