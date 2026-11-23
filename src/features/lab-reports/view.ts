import { formatDate } from "@/lib/dates";
import type { LabReportView } from "./components/lab-report-card";
import type { PrescriptionOption } from "./components/lab-report-form";

type PrescriptionLike = { id: string; doctorName: string | null; doctorSpecialty: string | null; issuedOn: Date | null };

/** "Dr. Kamal · Cardiologist · 12 Nov 2026" (dates are calendar dates stored at UTC midnight). */
export function prescriptionLabel(p: PrescriptionLike) {
  return [p.doctorName || "Doctor not named", p.doctorSpecialty, p.issuedOn ? formatDate(p.issuedOn, "UTC") : null].filter(Boolean).join(" · ");
}

export function toPrescriptionOptions(list: PrescriptionLike[]): PrescriptionOption[] {
  return list.map((p) => ({ id: p.id, label: prescriptionLabel(p) }));
}

/** Database row -> plain values for the client card. */
export function toLabReportView(r: {
  id: string;
  title: string;
  testDate: Date | null;
  labName: string | null;
  prescriptionId: string | null;
  notes: string | null;
  prescription: PrescriptionLike | null;
  files: { id: string; name: string; mimeType: string }[];
}): LabReportView {
  return {
    id: r.id,
    title: r.title,
    testDate: r.testDate ? r.testDate.toISOString().slice(0, 10) : null,
    dateLabel: r.testDate ? formatDate(r.testDate, "UTC") : null,
    labName: r.labName,
    prescriptionId: r.prescriptionId,
    doctorLabel: r.prescription ? prescriptionLabel(r.prescription) : null,
    notes: r.notes,
    files: r.files.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType })),
  };
}
