import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * The only place that knows which driver adapter is used.
 * To move to PostgreSQL: install @prisma/adapter-pg, set provider = "postgresql"
 * in schema.prisma and return `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`.
 */
export function createPrismaClient(options: { url: string; authToken?: string; logQueries?: boolean }) {
  const adapter = new PrismaLibSql({ url: options.url, authToken: options.authToken || undefined });
  return new PrismaClient({
    adapter,
    log: options.logQueries ? ["query", "warn", "error"] : ["warn", "error"],
  });
}
