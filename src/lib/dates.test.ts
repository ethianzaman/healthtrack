import { describe, expect, it } from "vitest";
import { ageFrom, startOfZonedDay, toZonedYmd, zonedDayRange } from "./dates";

describe("zoned dates", () => {
  it("finds local midnight in Dhaka (UTC+6)", () => {
    expect(startOfZonedDay("2026-03-10", "Asia/Dhaka").toISOString()).toBe("2026-03-09T18:00:00.000Z");
  });

  it("handles DST zones", () => {
    expect(startOfZonedDay("2026-07-01", "America/New_York").toISOString()).toBe("2026-07-01T04:00:00.000Z");
    expect(startOfZonedDay("2026-01-01", "America/New_York").toISOString()).toBe("2026-01-01T05:00:00.000Z");
  });

  it("builds an inclusive day range", () => {
    const r = zonedDayRange("2026-03-01", "2026-03-01", "UTC");
    expect(r.to.getTime() - r.from.getTime()).toBe(86_400_000);
  });

  it("converts instants to local calendar date", () => {
    expect(toZonedYmd(new Date("2026-03-09T19:00:00Z"), "Asia/Dhaka")).toBe("2026-03-10");
  });

  it("computes age", () => {
    expect(ageFrom(new Date("1960-06-15"), new Date("2026-06-14"))).toBe(65);
    expect(ageFrom(new Date("1960-06-15"), new Date("2026-06-15"))).toBe(66);
  });
});
