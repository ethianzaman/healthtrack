export type AppErrorCode = "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "PLAN_LIMIT";

const HTTP_STATUS: Record<AppErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PLAN_LIMIT: 402,
};

/** Expected, user-facing error. Anything else is treated as an internal error and not leaked. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: AppErrorCode = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "AppError";
  }

  get status() {
    return HTTP_STATUS[this.code];
  }
}

export const notFound = (what = "Resource") => new AppError(`${what} not found`, "NOT_FOUND");
