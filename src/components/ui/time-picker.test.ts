import { describe, expect, it } from "vitest";
import { formatTime12, joinTime, splitTime } from "./time-picker";

describe("time picker conversions", () => {
  it("converts between 24h values and 12h parts, including noon and midnight", () => {
    expect(splitTime("00:05")).toEqual({ hour: 12, minute: 5, pm: false });
    expect(splitTime("12:30")).toEqual({ hour: 12, minute: 30, pm: true });
    expect(splitTime("16:13")).toEqual({ hour: 4, minute: 13, pm: true });
    expect(joinTime(12, 0, false)).toBe("00:00");
    expect(joinTime(12, 45, true)).toBe("12:45");
    expect(joinTime(7, 30, false)).toBe("07:30");
    expect(joinTime(7, 30, true)).toBe("19:30");
    expect(formatTime12("19:05")).toBe("7:05 PM");
    expect(splitTime("")).toBeNull();
  });
});
