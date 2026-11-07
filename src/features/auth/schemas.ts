import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email,
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(128)
    .regex(/[A-Za-z]/, "Include a letter")
    .regex(/\d/, "Include a number"),
  timezone: z.string().min(1).default("Asia/Dhaka"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
