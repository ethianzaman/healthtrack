import "server-only";
import { AppError } from "@/server/errors";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window in-memory rate limiter.
 * Fine for a single instance; swap for Redis/Upstash when running multiple replicas.
 */
export function assertRateLimit(key: string, { limit, windowMs }: { limit: number; windowMs: number }) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count++;
  if (bucket.count > limit) {
    const seconds = Math.ceil((bucket.resetAt - now) / 1000);
    throw new AppError(`Too many attempts. Try again in ${seconds}s.`, "RATE_LIMITED");
  }
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
