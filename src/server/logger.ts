import "server-only";

type Level = "debug" | "info" | "warn" | "error";

/**
 * Minimal structured logger (JSON lines in production, readable in dev).
 * Replace the sink with Pino/Sentry/Datadog without touching call sites.
 */
function log(level: Level, message: string, meta?: unknown) {
  const isProd = process.env.NODE_ENV === "production";
  const error = meta instanceof Error ? { name: meta.name, message: meta.message, stack: meta.stack } : meta;
  if (isProd) {
    console[level === "debug" ? "log" : level](JSON.stringify({ level, message, meta: error, time: new Date().toISOString() }));
  } else {
    console[level === "debug" ? "log" : level](`[${level}] ${message}`, error ?? "");
  }
}

export const logger = {
  debug: (m: string, meta?: unknown) => log("debug", m, meta),
  info: (m: string, meta?: unknown) => log("info", m, meta),
  warn: (m: string, meta?: unknown) => log("warn", m, meta),
  error: (m: string, meta?: unknown) => log("error", m, meta),
};
