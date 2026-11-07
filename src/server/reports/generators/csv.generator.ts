import "server-only";
import Papa from "papaparse";
import { classifyBloodPressure } from "@/domain/blood-pressure";
import { classifyGlucose, fromMgDl } from "@/domain/glucose";
import { formatTime24, toZonedYmd } from "@/lib/dates";
import type { ReportGenerator } from "../types";

const COLUMNS = [
  "type",
  "date",
  "time",
  "time_of_day",
  "meal_timing",
  "systolic",
  "diastolic",
  "pulse",
  "arm",
  "glucose_mg_dl",
  "glucose_mmol_l",
  "status",
  "note",
] as const;

/** Lets Excel detect UTF-8. */
const UTF8_BOM = String.fromCharCode(0xfeff);

type Row = Partial<Record<(typeof COLUMNS)[number], string | number>>;

/** One tidy, machine-readable table (one row per reading) - ideal for Excel or analysis. */
export const csvGenerator: ReportGenerator = {
  format: "csv",
  contentType: "text/csv; charset=utf-8",
  extension: "csv",
  async generate({ data, timeZone }) {
    const rows: { at: number; row: Row }[] = [];
    for (const r of data.bp.readings) {
      rows.push({ at: r.measuredAt.getTime(), row: {
        type: "blood_pressure",
        date: toZonedYmd(r.measuredAt, timeZone),
        time: formatTime24(r.measuredAt, timeZone),
        time_of_day: r.timeOfDay,
        systolic: r.systolic,
        diastolic: r.diastolic,
        pulse: r.pulse ?? "",
        arm: r.arm ?? "",
        status: classifyBloodPressure(r.systolic, r.diastolic).label,
        note: r.note ?? "",
      } });
    }
    for (const r of data.glucose.readings) {
      rows.push({ at: r.measuredAt.getTime(), row: {
        type: "glucose",
        date: toZonedYmd(r.measuredAt, timeZone),
        time: formatTime24(r.measuredAt, timeZone),
        time_of_day: r.timeOfDay,
        meal_timing: r.mealTiming,
        glucose_mg_dl: Math.round(r.valueMgDl),
        glucose_mmol_l: fromMgDl(r.valueMgDl, "MMOL_L").toFixed(1),
        status: classifyGlucose(r.valueMgDl, r.mealTiming, data.glucose.targets).label,
        note: r.note ?? "",
      } });
    }
    rows.sort((a, b) => a.at - b.at);
    // BOM so Excel opens UTF-8 correctly.
    return UTF8_BOM + Papa.unparse({ fields: [...COLUMNS], data: rows.map(({ row }) => COLUMNS.map((c) => row[c] ?? "")) });
  },
};
