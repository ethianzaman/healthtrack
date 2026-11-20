import { describe, expect, it } from "vitest";
import { DEFAULT_GLUCOSE_TARGETS, formatGlucoseDual, formatGlucoseRangeDual } from "@/domain/glucose";
import { BP_REPORT_COLUMNS, GLUCOSE_REPORT_COLUMNS } from "@/features/reports/schemas";
import { dailyBloodPressureTable, dailyGlucoseTable, glucoseSlotOf } from "./daily-log";
import { cellText } from "./cells";
import type { ReportTable } from "./view-model";

const tz = "Asia/Dhaka";
// Local Dhaka time (UTC+6).
const at = (day: number, hourLocal: number, minute = 0) => new Date(Date.UTC(2026, 10, day, hourLocal - 6, minute));
const texts = (t: ReportTable) => t.rows.map((r) => r.cells.map(cellText));

describe("glucose in both units", () => {
  it('reads "mmol/L or mg/dL"', () => {
    expect(formatGlucoseDual(97)).toBe("5.4 mmol/L or 97 mg/dL");
    expect(formatGlucoseRangeDual(70, 130)).toBe("3.9-7.2 mmol/L or 70-130 mg/dL");
  });
});

describe("dailyBloodPressureTable", () => {
  const bp = (day: number, hour: number, sys: number, dia: number, timeOfDay: "MORNING" | "NIGHT", extra: { note?: string; pulse?: number; arm?: "LEFT" | "RIGHT" } = {}) => ({
    measuredAt: at(day, hour),
    systolic: sys,
    diastolic: dia,
    pulse: extra.pulse ?? null,
    arm: extra.arm ?? null,
    timeOfDay,
    note: extra.note ?? null,
  });

  it("one row per day: readings with small-print time, one Status for the day (worst reading)", () => {
    const t = dailyBloodPressureTable(
      [bp(9, 23, 120, 70, "NIGHT"), bp(9, 11, 140, 80, "MORNING", { arm: "RIGHT", pulse: 72 }), bp(12, 11, 118, 76, "MORNING", { note: "after walk" })],
      tz,
      BP_REPORT_COLUMNS,
    );
    expect(t.columns).toEqual(["Date", "Morning", "Night", "Status", "Note"]);
    expect(t.statusColumn).toBe(3);
    expect(texts(t)).toEqual([
      ["09 Nov 2026 (Mon)", "140/80 mmHg (11:00 am · 72 bpm · right arm)", "120/70 mmHg (11:00 pm)", "High (stage 2)", ""],
      ["12 Nov 2026 (Thu)", "118/76 mmHg (11:00 am)", "-", "Normal", "after walk (Morning)"],
    ]);
    expect(t.rows.map((r) => r.severity)).toEqual(["high", "normal"]);
    expect(t.rows[0].cellSeverity).toEqual([undefined, "high", "elevated", undefined, undefined]);
    expect(t.footnotes?.[0]).toContain("ACC/AHA");
  });

  it("lists every reading in a slot and picks the worse category on a tie (stage 2 over stage 1)", () => {
    const t = dailyBloodPressureTable([bp(5, 8, 132, 82, "MORNING"), bp(5, 8, 150, 95, "MORNING"), bp(5, 21, 185, 100, "NIGHT")], tz, ["status"]);
    expect(texts(t)[0]).toEqual(["05 Nov 2026 (Thu)", "132/82 mmHg\n150/95 mmHg", "185/100 mmHg", "DANGER (crisis)"]);
    expect(t.rows[0].severity).toBe("critical");
    const tie = dailyBloodPressureTable([bp(6, 8, 132, 82, "MORNING"), bp(6, 9, 150, 95, "MORNING")], tz, ["status"]);
    expect(texts(tie)[0][2]).toBe("High (stage 2)");
  });

  it("drops the columns that were not chosen", () => {
    const t = dailyBloodPressureTable([bp(5, 8, 130, 85, "MORNING", { pulse: 70, arm: "LEFT", note: "x" })], tz, []);
    expect(t.columns).toEqual(["Date", "Morning"]);
    expect(texts(t)[0]).toEqual(["05 Nov 2026 (Thu)", "130/85 mmHg"]);
    expect(t.statusColumn).toBeUndefined();
    expect(t.footnotes).toEqual([]);
  });
});

describe("dailyGlucoseTable", () => {
  const g = (day: number, hour: number, valueMgDl: number, mealTiming: "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL" | "BEDTIME", timeOfDay: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT", note: string | null = null) => ({
    measuredAt: at(day, hour, 10),
    valueMgDl,
    mealTiming,
    timeOfDay,
    note,
  });

  it("maps meal timing + time of day to the right column", () => {
    expect(glucoseSlotOf({ mealTiming: "BEFORE_MEAL", timeOfDay: "AFTERNOON" })).toBe("before-lunch");
    expect(glucoseSlotOf({ mealTiming: "AFTER_MEAL", timeOfDay: "NIGHT" })).toBe("after-dinner");
    expect(glucoseSlotOf({ mealTiming: "FASTING", timeOfDay: "EVENING" })).toBe("fasting");
  });

  it("one row per date, value on one line with the time beside it, one Status for the day", () => {
    const t = dailyGlucoseTable(
      [
        g(19, 22, 106, "BEDTIME", "NIGHT"),
        g(19, 10, 97, "FASTING", "MORNING"),
        g(19, 13, 124, "AFTER_MEAL", "AFTERNOON"),
        g(20, 7, 50, "FASTING", "MORNING", "felt shaky"),
        g(20, 13, 300, "AFTER_MEAL", "AFTERNOON"),
      ],
      tz,
      DEFAULT_GLUCOSE_TARGETS,
      GLUCOSE_REPORT_COLUMNS,
    );
    expect(t.columns).toEqual(["Date", "Fasting", "2h after lunch", "Bedtime", "Status", "Note"]);
    expect(texts(t)).toEqual([
      ["19 Nov 2026 (Thu)", "5.4 mmol/L or 97 mg/dL (10:10 am)", "6.9 mmol/L or 124 mg/dL (01:10 pm)", "5.9 mmol/L or 106 mg/dL (10:10 pm)", "Normal", ""],
      ["20 Nov 2026 (Fri)", "2.8 mmol/L or 50 mg/dL (07:10 am)", "16.6 mmol/L or 300 mg/dL (01:10 pm)", "-", "DANGER (very low)", "felt shaky (Fasting)"],
    ]);
    expect(t.rows.map((r) => r.severity)).toEqual(["normal", "critical"]);
    expect(t.footnotes?.[0]).toContain("3.9-7.2 mmol/L or 70-130 mg/dL");
  });

  it("drops unchosen details", () => {
    const t = dailyGlucoseTable([g(19, 10, 97, "FASTING", "MORNING", "x")], tz, DEFAULT_GLUCOSE_TARGETS, []);
    expect(t.columns).toEqual(["Date", "Fasting"]);
    expect(texts(t)[0]).toEqual(["19 Nov 2026 (Thu)", "5.4 mmol/L or 97 mg/dL"]);
    expect(t.footnotes).toEqual([]);
  });
});
