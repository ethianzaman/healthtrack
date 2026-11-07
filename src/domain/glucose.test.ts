import { describe, expect, it } from "vitest";
import { classifyGlucose, estimateA1c, formatGlucose, fromMgDl, toMgDl } from "./glucose";

describe("classifyGlucose", () => {
  it.each([
    [50, "FASTING", "VERY_LOW"],
    [65, "FASTING", "LOW"],
    [110, "FASTING", "IN_RANGE"],
    [140, "BEFORE_MEAL", "HIGH"],
    [160, "AFTER_MEAL", "IN_RANGE"],
    [200, "AFTER_MEAL", "HIGH"],
    [300, "RANDOM", "VERY_HIGH"],
  ] as const)("%i mg/dL %s -> %s", (value, timing, expected) => {
    expect(classifyGlucose(value, timing).category).toBe(expected);
  });

  it("respects personal targets", () => {
    const targets = { low: 80, fastingMax: 110, postMealMax: 160 };
    expect(classifyGlucose(75, "FASTING", targets).category).toBe("LOW");
    expect(classifyGlucose(120, "FASTING", targets).category).toBe("HIGH");
    expect(classifyGlucose(170, "AFTER_MEAL", targets).category).toBe("HIGH");
  });
});

describe("units", () => {
  it("round-trips mmol/L", () => {
    expect(fromMgDl(toMgDl(7.2, "MMOL_L"), "MMOL_L")).toBeCloseTo(7.2, 5);
  });
  it("formats per unit", () => {
    expect(formatGlucose(126, "MG_DL")).toBe("126 mg/dL");
    expect(formatGlucose(126, "MMOL_L")).toBe("7.0 mmol/L");
  });
});

describe("estimateA1c", () => {
  it("matches the ADAG reference point (154 mg/dL ~ 7%)", () => {
    expect(estimateA1c(154)).toBe(7);
  });
});
