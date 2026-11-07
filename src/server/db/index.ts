import "server-only";
import { getEnv } from "@/config/env";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "./client-factory";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function init() {
  const env = getEnv();
  return createPrismaClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });
}

/** Singleton client (re-used across hot reloads in development). */
export const db: PrismaClient = globalForPrisma.prisma ?? init();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
