export interface DateRange {
  from: Date;
  to: Date; // exclusive
}

/** Common filter for every time-series table scoped to a profile. */
export function profileRangeWhere(profileId: string, range?: DateRange) {
  return {
    profileId,
    ...(range ? { measuredAt: { gte: range.from, lt: range.to } } : {}),
  };
}

export interface ListOptions {
  take?: number;
  order?: "asc" | "desc";
}
