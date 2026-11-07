import { describe, expect, it } from "vitest";
import { classifyBloodPressure, isBpOnTarget } from "./blood-pressure";

describe("classifyBloodPressure (ACC/AHA 2017)", () => {
  it.each([
    [115, 75, "NORMAL"],
    [125, 78, "ELEVATED"],
    [132, 78, "STAGE_1"],
    [118, 84, "STAGE_1"],
    [145, 85, "STAGE_2"],
    [128, 92, "STAGE_2"],
    [185, 100, "CRISIS"],
    [150, 125, "CRISIS"],
    [85, 55, "LOW"],
  ])("%i/%i -> %s", (sys, dia, expected) => {
    expect(classifyBloodPressure(sys, dia).category).toBe(expected);
  });

  it("uses the higher-risk component", () => {
    expect(classifyBloodPressure(119, 95).category).toBe("STAGE_2");
  });
});

describe("isBpOnTarget", () => {
  const target = { systolic: 130, diastolic: 80 };
  it("is true below target", () => expect(isBpOnTarget(125, 75, target)).toBe(true));
  it("is false at target", () => expect(isBpOnTarget(130, 75, target)).toBe(false));
  it("is false when hypotensive", () => expect(isBpOnTarget(85, 55, target)).toBe(false));
});
