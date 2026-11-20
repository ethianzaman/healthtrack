import "server-only";
import { notFound } from "next/navigation";
import { getEnv } from "@/config/env";
import { parseAdminEmails } from "@/domain/activity";
import { getCurrentUser } from "./context";

export function isAdminEmail(email: string) {
  return parseAdminEmails(getEnv().ADMIN_EMAILS).has(email.toLowerCase());
}

/** Admin pages and actions: anyone else gets a plain 404, so /admin doesn't advertise itself. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) notFound();
  return user;
}
