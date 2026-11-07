import { describe, expect, it } from "vitest";
import { DEFAULT_GLUCOSE_TARGETS } from "./glucose";
import { glucoseInsights, bloodPressureInsights } from "./insights";
import { summarizeBloodPressure, summarizeGlucose } from "./summary";

const at = new Date("2026-01-01T08:00:00Z");

describe("summarizeBloodPressure", () => {
  const readings = [
    { systolic: 150, diastolic: 95, pulse: 80, timeOfDay: "MORNING" as const, measuredAt: at },
    { systolic: 148, diastolic: 92, pulse: null, timeOfDay: "MORNING" as const, measuredAt: at },
    { systolic: 124, diastolic: 76, pulse: 70, timeOfDay: "EVENING" as const, measuredAt: at },
    { systolic: 126, diastolic: 78, pulse: 72, timeOfDay: "EVENING" as const, measuredAt: at },
  ];
  const s = summarizeBloodPressure(readings, { systolic: 130, diastolic: 80 });

  it("computes averages per period", () => {
    expect(s.count).toBe(4);
    expect(s.byTimeOfDay.map((p) => [p.timeOfDay, p.systolicAvg])).toEqual([
      ["MORNING", 149],
      ["EVENING", 125],
    ]);
    expect(s.pulse.count).toBe(3);
  });

  it("tracks worst category and target share", () => {
    expect(s.worstCategory).toBe("STAGE_2");
    expect(s.onTargetPct).toBe(50);
  });

  it("flags a morning/evening gap", () => {
    expect(bloodPressureInsights(s).map((i) => i.id)).toContain("bp-morning-evening");
  });
});

describe("summarizeGlucose", () => {
  const mk = (valueMgDl: number, timeOfDay: "MORNING" | "EVENING", mealTiming: "FASTING" | "AFTER_MEAL") => ({
    valueMgDl,
    timeOfDay,
    mealTiming,
    measuredAt: at,
  });
  const readings = [
    mk(100, "MORNING", "FASTING"),
    mk(120, "MORNING", "FASTING"),
    mk(210, "MORNING", "AFTER_MEAL"),
    mk(220, "MORNING", "AFTER_MEAL"),
    mk(65, "EVENING", "FASTING"),
  ];
  const s = summarizeGlucose(readings, DEFAULT_GLUCOSE_TARGETS);

  it("splits slots by before/after meal", () => {
    const morning = s.slots.find((x) => x.timeOfDay === "MORNING")!;
    expect(morning.before.avg).toBe(110);
    expect(morning.after.avg).toBe(215);
  });

  it("counts lows and in-range share", () => {
    expect(s.lowCount).toBe(1);
    expect(s.inRangePct).toBe(40);
    expect(s.estimatedA1c).toBeNull(); // too few readings
  });

  it("produces insights", () => {
    const ids = glucoseInsights(s, DEFAULT_GLUCOSE_TARGETS).map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(["glucose-lows", "glucose-post-meal", "glucose-in-range"]));
  });
});
