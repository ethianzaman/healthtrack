import { describe, expect, it } from "vitest";
import { courseEnd, ingredientsOf, medicationStatus, sharedIngredients } from "./medication";

describe("medication course", () => {
  const start = new Date("2026-11-12T00:00:00Z");

  it("computes the end of a course; Continue has no end", () => {
    expect(courseEnd(start, 14)?.toISOString()).toBe("2026-11-26T00:00:00.000Z");
    expect(courseEnd(start, null)).toBeNull();
  });

  it("is active until the end date, then completed; stopping early wins", () => {
    const end = courseEnd(start, 14);
    expect(medicationStatus({ active: true, endDate: end }, new Date("2026-11-20T00:00:00Z"))).toBe("ACTIVE");
    expect(medicationStatus({ active: true, endDate: end }, new Date("2026-11-27T00:00:00Z"))).toBe("COMPLETED");
    expect(medicationStatus({ active: true, endDate: null }, new Date("2030-01-01T00:00:00Z"))).toBe("ACTIVE");
    expect(medicationStatus({ active: false, endDate: end }, new Date("2026-11-20T00:00:00Z"))).toBe("STOPPED");
  });
});

describe("same-ingredient detection", () => {
  it("normalises salts and keeps vitamins distinct", () => {
    expect(ingredientsOf("Hydrochlorothiazide + Losartan Potassium")).toEqual(["hydrochlorothiazide", "losartan"]);
    expect(ingredientsOf("Calcium Carbonate + Vitamin D3")).toEqual(["calcium", "vitamin d3"]);
    expect(ingredientsOf(null)).toEqual([]);
  });

  it("finds overlaps across different brands (Amdocal vs Camlodin vs Amlodipine + Atenolol)", () => {
    const current = [{ generic: "Amlodipine" }, { generic: "Metformin Hydrochloride" }, { generic: null }];
    expect(sharedIngredients("Amlodipine + Atenolol", current)).toEqual(["amlodipine"]);
    expect(sharedIngredients("Losartan Potassium", current)).toEqual([]);
    expect(sharedIngredients("Vitamin B12", [{ generic: "Vitamin D3" }])).toEqual([]);
  });
});

describe("course length text", () => {
  it("reads typed lengths", async () => {
    const { parseDuration } = await import("./medication");
    expect(parseDuration("45")).toBe(45);
    expect(parseDuration("10 days")).toBe(10);
    expect(parseDuration("2 weeks")).toBe(14);
    expect(parseDuration("3 months")).toBe(90);
    expect(parseDuration("1 year")).toBe(365);
    expect(parseDuration("Continue")).toBeNull();
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("soon")).toBeUndefined();
  });

  it("formats days back for the field", async () => {
    const { formatDuration } = await import("./medication");
    expect([formatDuration(null), formatDuration(7), formatDuration(14), formatDuration(21), formatDuration(30), formatDuration(90), formatDuration(45)]).toEqual([
      "Continue", "7 days", "14 days", "3 weeks", "1 month", "3 months", "45 days",
    ]);
  });
});
