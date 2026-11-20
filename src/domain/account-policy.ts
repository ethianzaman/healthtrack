/**
 * Account warning / suspension / deletion policy. The Terms page and the code read the
 * same numbers, so what users are told is always what the system does.
 */
export const WARNING_RESPONSE_DAYS = 14;
export const DELETION_GRACE_DAYS = 30;

const DAY_MS = 86_400_000;

export function warningDeadline(now = new Date()) {
  return new Date(now.getTime() + WARNING_RESPONSE_DAYS * DAY_MS);
}

export function deletionDate(now = new Date()) {
  return new Date(now.getTime() + DELETION_GRACE_DAYS * DAY_MS);
}
