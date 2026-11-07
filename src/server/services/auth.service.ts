import "server-only";
import { isValidTimeZone } from "@/lib/dates";
import type { LoginInput, RegisterInput } from "@/features/auth/schemas";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { userRepository } from "@/server/repositories/user.repository";
import { assertRateLimit, resetRateLimit } from "@/server/security/rate-limit";

const LOGIN_LIMIT = { limit: 5, windowMs: 15 * 60_000 };
const INVALID_CREDENTIALS = "Invalid email or password";

export const authService = {
  async register(input: Required<RegisterInput>) {
    assertRateLimit(`register:${input.email}`, LOGIN_LIMIT);
    if (await userRepository.existsByEmail(input.email)) {
      throw new AppError("An account with this email already exists", "CONFLICT");
    }
    const user = await userRepository.createWithDefaultProfile({
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      timezone: isValidTimeZone(input.timezone) ? input.timezone : "Asia/Dhaka",
    });
    await createSession(user.id);
    return user;
  },

  async login(input: LoginInput) {
    const key = `login:${input.email}`;
    assertRateLimit(key, LOGIN_LIMIT);
    const user = await userRepository.findByEmailWithPassword(input.email);
    // Same message for unknown email and wrong password to prevent account enumeration.
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError(INVALID_CREDENTIALS, "UNAUTHORIZED");
    }
    resetRateLimit(key);
    await createSession(user.id);
    return { id: user.id };
  },

  logout: destroySession,
};
