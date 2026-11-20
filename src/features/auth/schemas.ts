import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));

const newPassword = z
  .string()
  .min(8, "At least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/\d/, "Include a number");

/** Six digits; spaces/dashes people paste from the email are stripped. */
const code = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, "Enter the 6-digit code"));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email,
  password: newPassword,
  timezone: z.string().min(1).default("Asia/Dhaka"),
});

export const verifyEmailSchema = z.object({ code });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ email, code, password: newPassword });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
