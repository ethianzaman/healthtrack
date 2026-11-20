import "server-only";
import bcrypt from "bcryptjs";

/** OWASP minimum is 10; each extra round doubles login time on serverless CPUs. */
const ROUNDS = 10;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

/** Hashes made with a different cost are re-hashed after the next successful login. */
export function needsRehash(hash: string) {
  return bcrypt.getRounds(hash) !== ROUNDS;
}
