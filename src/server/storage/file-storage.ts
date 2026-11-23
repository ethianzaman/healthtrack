import "server-only";
import { getEnv } from "@/config/env";
import { createSupabaseStorage, type FileStorage } from "./supabase-storage";

let cached: FileStorage | null | undefined;

/** Cloud storage for report files, or null when not configured (files then stay in the database). */
export function cloudStorage(): FileStorage | null {
  if (cached === undefined) {
    const env = getEnv();
    cached =
      env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseStorage({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, bucket: env.SUPABASE_BUCKET })
        : null;
  }
  return cached;
}
