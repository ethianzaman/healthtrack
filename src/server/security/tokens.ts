import "server-only";
import { createHash, randomBytes } from "node:crypto";

export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** Tokens are stored hashed so a database leak doesn't expose usable share links. */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
