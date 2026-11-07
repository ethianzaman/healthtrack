import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Optional here: `prisma generate` runs at install time (e.g. on Vercel) before env vars
    // are needed. The app validates DATABASE_URL at runtime in src/config/env.ts.
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
