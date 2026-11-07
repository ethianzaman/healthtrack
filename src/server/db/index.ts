import "server-only";
import { getEnv } from "@/config/env";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "./client-factory";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function client(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const env = getEnv();
    globalForPrisma.prisma = createPrismaClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });
  }
  return globalForPrisma.prisma;
}

/**
 * Singleton client, created on first use rather than on import, so `next build`
 * can analyse routes without database credentials being present.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const real = client();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
