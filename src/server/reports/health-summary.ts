import { treats } from "@/domain/conditions";
import { formatDate } from "@/lib/dates";
import { plain, type CellLine } from "./cells";
import type { ReportTable } from "./view-model";

/**
 * The report's Health Summary page: the condition list with what treats each one now, and
 * a dated list of what changed in the period (medicines started, stopped or finished,
 * conditions diagnosed or resolved). Pure: inputs are plain rows.
 */

interface ConditionRow {
  name: string;
  status: string;
  diagnosedOn: Date | null;
  resolvedOn: Date | null;
  doctorName: string | null;
}

interface MedicineRow {
  name: string;
  dosage: string;
  schedule: string;
  condition: string | null;
  active: boolean;
  startDate: Date | null;
  endDate: Date | null;
  stoppedAt: Date | null;
  stopReason: string | null;
  prescription: { doctorName: string | null } | null;
}

interface LabRow {
  title: string;
  testDate: Date | null;
  labName: string | null;
  notes: string | null;
  prescription: { doctorName: string | null } | null;
  files: unknown[];
}

const medLabel = (m: MedicineRow) => [m.name, m.dosage].filter(Boolean).join(" ");

export function healthSummaryTables(o: {
  conditions: ConditionRow[];
  /** Medicines being taken now. */
  current: MedicineRow[];
  /** Every medicine (to find what started / ended in the period). */
  all: MedicineRow[];
  /** Tests done in the period. */
  labReports?: LabRow[];
  range: { from: Date; to: Date };
  timeZone: string;
}): ReportTable[] {
  const tables: ReportTable[] = [];
  // Diagnosis dates are calendar dates stored at UTC midnight.
  const day = (d: Date) => formatDate(d, "UTC");
  const at = (d: Date) => formatDate(d, o.timeZone);
  const inRange = (d: Date | null): d is Date => d !== null && d >= o.range.from && d < o.range.to;

  if (o.conditions.length) {
    const ordered = [...o.conditions].sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === "ONGOING" ? -1 : 1));
    tables.push({
      heading: "Conditions",
      columns: ["Condition", "Since", "Status", "Treating doctor", "Current medicines"],
      widths: [1.3, 0.8, 0.8, 1.1, 1.8],
      rows: ordered.map((c) => {
        const meds = c.status === "ONGOING" ? o.current.filter((m) => treats(m.condition, c.name)) : [];
        const medsCell: CellLine[] = meds.length ? meds.map((m) => ({ text: medLabel(m), note: m.schedule })) : plain(c.status === "ONGOING" ? "-" : "");
        return {
          cells: [
            [{ text: c.name }],
            plain(c.diagnosedOn ? day(c.diagnosedOn) : "-"),
            plain(c.status === "ONGOING" ? "Ongoing" : `Resolved${c.resolvedOn ? ` ${day(c.resolvedOn)}` : ""}`),
            plain(c.doctorName ?? ""),
            medsCell,
          ],
        };
      }),
    });
  }

  const changes: { when: Date; what: string; detail: string }[] = [];
  for (const m of o.all) {
    const doctor = m.prescription?.doctorName ? ` · ${m.prescription.doctorName}` : "";
    if (inRange(m.startDate)) changes.push({ when: m.startDate, what: `Started ${medLabel(m)}`, detail: `${m.schedule}${m.condition ? ` for ${m.condition}` : ""}${doctor}` });
    if (inRange(m.stoppedAt)) changes.push({ when: m.stoppedAt, what: `Stopped ${medLabel(m)}`, detail: m.stopReason ?? "" });
    else if (m.active && inRange(m.endDate)) changes.push({ when: m.endDate, what: `Finished ${medLabel(m)}`, detail: "Course completed" });
  }
  for (const c of o.conditions) {
    if (inRange(c.diagnosedOn)) changes.push({ when: c.diagnosedOn, what: `Diagnosed: ${c.name}`, detail: c.doctorName ?? "" });
    if (inRange(c.resolvedOn)) changes.push({ when: c.resolvedOn, what: `Resolved: ${c.name}`, detail: "" });
  }
  if (changes.length) {
    tables.push({
      heading: "Changes in this period",
      columns: ["Date", "Change", "Details"],
      widths: [0.8, 1.6, 2.2],
      rows: changes.sort((a, b) => a.when.getTime() - b.when.getTime()).map((c) => ({ cells: [plain(at(c.when)), [{ text: c.what }], plain(c.detail)] })),
    });
  }
  const tests = [...(o.labReports ?? [])].sort((a, b) => (a.testDate?.getTime() ?? 0) - (b.testDate?.getTime() ?? 0));
  if (tests.length) {
    tables.push({
      heading: "Test reports in this period",
      columns: ["Date", "Test", "Lab", "Asked by", "Notes"],
      widths: [0.8, 1.3, 1, 1, 1.9],
      rows: tests.map((t) => ({
        cells: [
          plain(t.testDate ? day(t.testDate) : "-"),
          [{ text: t.title, note: t.files.length ? `${t.files.length} ${t.files.length === 1 ? "page" : "pages"} in the app` : undefined }],
          plain(t.labName ?? ""),
          plain(t.prescription?.doctorName ?? ""),
          plain(t.notes ?? ""),
        ],
      })),
    });
  }
  return tables;
}
