import { describe, expect, it } from "vitest";
import { DEFAULT_GLUCOSE_TARGETS, formatGlucoseDual, formatGlucoseRangeDual } from "@/domain/glucose";
import { dailyBloodPressureTable, dailyGlucoseTable } from "./daily-log";

const tz = "Asia/Dhaka";
// 08:00 and 21:00 Dhaka time (UTC+6) on two days.
const at = (day: number, hourLocal: number) => new Date(Date.UTC(2026, 10, day, hourLocal - 6));

describe("formatGlucoseDual", () => {
  it("shows the preferred unit first and the other in brackets", () => {
    expect(formatGlucoseDual(110, "MMOL_L")).toBe("6.1 mmol/L (110 mg/dL)");
    expect(formatGlucoseDual(110, "MG_DL", true)).toBe("110 (6.1)");
    expect(formatGlucoseRangeDual(70, 130, "MG_DL")).toBe("70-130 mg/dL (3.9-7.2 mmol/L)");
  });
});

describe("dailyBloodPressureTable", () => {
  const bp = (day: number, hour: number, sys: number, dia: number, timeOfDay: "MORNING" | "EVENING", note: string | null = null) => ({
    measuredAt: at(day, hour),
    systolic: sys,
    diastolic: dia,
    pulse: 70,
    timeOfDay,
    note,
  });

  it("puts morning and evening of the same day on one row", () => {
    const t = dailyBloodPressureTable(
      [bp(5, 21, 120, 78, "EVENING"), bp(5, 8, 132, 84, "MORNING"), bp(6, 8, 128, 82, "MORNING", "after walk")],
      tz,
    );
    expect(t.columns).toEqual(["Date", "Morning", "Evening", "Pulse (avg)"]);
    expect(t.rows.map((r) => r.cells)).toEqual([
      ["Thu 05 Nov", "132/84", "120/78", "70"],
      ["Fri 06 Nov", "128/82*", "-", "70"],
    ]);
    expect(t.footnotes).toEqual(["Fri 06 Nov, Morning: after walk"]);
  });

  it("averages repeated readings in one slot and colours each cell by its own value", () => {
    const t = dailyBloodPressureTable([bp(5, 8, 150, 95, "MORNING"), bp(5, 9, 146, 91, "MORNING"), bp(5, 21, 118, 76, "EVENING")], tz);
    expect(t.rows[0].cells[1]).toBe("148/93 (avg of 2)");
    expect(t.rows[0].cellSeverity?.[1]).toBe("high");
    expect(t.rows[0].cellSeverity?.[2]).toBe("normal");
  });
});

describe("dailyGlucoseTable", () => {
  it("maps meal timing + time of day to breakfast/lunch/dinner columns, dropping unused ones", () => {
    const g = (hour: number, valueMgDl: number, mealTiming: "FASTING" | "AFTER_MEAL", timeOfDay: "MORNING" | "NIGHT") => ({
      measuredAt: at(5, hour),
      valueMgDl,
      mealTiming,
      timeOfDay,
      note: null,
    });
    const t = dailyGlucoseTable([g(7, 110, "FASTING", "MORNING"), g(10, 200, "AFTER_MEAL", "MORNING"), g(22, 150, "AFTER_MEAL", "NIGHT")], tz, "MMOL_L", DEFAULT_GLUCOSE_TARGETS);
    expect(t.title).toContain("mmol/L (mg/dL)");
    expect(t.columns).toEqual(["Date", "Fasting", "After breakfast", "After dinner"]);
    expect(t.rows[0].cells).toEqual(["Thu 05 Nov", "6.1 (110)", "11.1 (200)", "8.3 (150)"]);
    expect(t.rows[0].cellSeverity?.slice(1)).toEqual(["normal", "high", "normal"]);
  });
});
