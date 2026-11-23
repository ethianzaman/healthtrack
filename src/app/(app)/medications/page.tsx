import type { Metadata } from "next";
import { getEnv } from "@/config/env";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { MEAL_TIMING_TEXT, MEDICATION_STATUS_TEXT, medicationStatus, type MedicationMealTiming, type MedicationStatus } from "@/domain/medication";
import { MedicationActions } from "@/features/medications/components/medication-actions";
import { MedicationEditButton, PrescriptionEditButton, type EditableMedication } from "@/features/medications/components/medication-edit";
import { MedicinesForm, type CurrentMedicine } from "@/features/medications/components/medicines-form";
import { PrescriptionScanner } from "@/features/medications/components/prescription-scanner";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { requireAppContext } from "@/server/auth/context";
import { conditionRepository } from "@/server/repositories/condition.repository";
import { medicationRepository, type MedicationWithPrescription } from "@/server/repositories/medication.repository";

export const metadata: Metadata = { title: "Medications" };

const STATUS_STYLE: Record<MedicationStatus, string> = {
  ACTIVE: "bg-sev-normal-bg text-sev-normal",
  COMPLETED: "bg-sunken text-ink-3",
  STOPPED: "bg-sev-critical-bg text-sev-critical",
};

/** Groups medicines by the prescription (doctor) they came with; loose ones share one group. */
function byPrescription(meds: MedicationWithPrescription[]) {
  const groups = new Map<string, { title: string; meta: string; prescription: MedicationWithPrescription["prescription"]; meds: MedicationWithPrescription[] }>();
  for (const m of meds) {
    const p = m.prescription;
    const key = p?.id ?? "none";
    if (!groups.has(key)) {
      groups.set(key, {
        title: p ? [p.doctorName, p.doctorSpecialty].filter(Boolean).join(" · ") || "Prescription" : "Added without a doctor",
        meta: p ? [p.condition, p.issuedOn ? formatDate(p.issuedOn, "UTC") : null].filter(Boolean).join(" · ") : "",
        prescription: p,
        meds: [],
      });
    }
    groups.get(key)!.meds.push(m);
  }
  return [...groups.values()];
}

const DAY_MS = 86_400_000;
const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Saved medicine -> plain values for the edit dialog (course length back from its dates). */
function toEditable(m: MedicationWithPrescription): EditableMedication {
  return {
    id: m.id,
    name: m.name,
    form: m.form,
    generic: m.generic,
    dosage: m.dosage,
    schedule: m.schedule,
    mealTiming: m.mealTiming,
    notes: m.notes,
    startDate: ymd(m.startDate),
    durationDays: m.startDate && m.endDate ? Math.max(1, Math.round((m.endDate.getTime() - m.startDate.getTime()) / DAY_MS)) : null,
  };
}

function MedicineRow({ m, tz }: { m: MedicationWithPrescription; tz: string }) {
  const status = medicationStatus(m);
  const details = [m.dosage, m.schedule, m.mealTiming ? MEAL_TIMING_TEXT[m.mealTiming as MedicationMealTiming] : null].filter(Boolean).join(" · ");
  const course =
    status === "STOPPED"
      ? `Stopped ${m.stoppedAt ? formatDate(m.stoppedAt, tz) : ""}${m.stopReason ? ` — ${m.stopReason}` : ""}`
      : m.endDate
        ? `${status === "COMPLETED" ? "Finished" : "Until"} ${formatDate(m.endDate, tz)}`
        : "Continue";
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-ink">{m.name}</span>
          {m.form ? <span className="text-[12px] text-ink-3">{m.form}</span> : null}
          <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider", STATUS_STYLE[status])}>{MEDICATION_STATUS_TEXT[status]}</span>
        </p>
        {m.generic ? <p className="text-[13px] text-ink-3">{m.generic}</p> : null}
        <p className="mt-1 font-mono text-[13px] text-ink-2">{details}</p>
        <p className="text-[12px] text-ink-3">
          {course}
          {m.condition && !m.prescription?.condition ? ` · For ${m.condition}` : ""}
          {m.notes ? ` · ${m.notes}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <MedicationEditButton medication={toEditable(m)} />
        <MedicationActions id={m.id} name={m.name} stopped={status === "STOPPED"} />
      </div>
    </li>
  );
}

export default async function MedicationsPage() {
  const { profile, user } = await requireAppContext();
  const [meds, conditionRows] = await Promise.all([medicationRepository.list(profile.id), conditionRepository.list(profile.id)]);
  const conditionNames = conditionRows.map((c) => c.name);
  const tz = user.timezone;
  const current = meds.filter((m) => medicationStatus(m) === "ACTIVE");
  const past = meds.filter((m) => medicationStatus(m) !== "ACTIVE");
  const currentForWarnings: CurrentMedicine[] = current.map((m) => ({ name: m.name, generic: m.generic, doctor: m.prescription?.doctorName ?? null }));

  return (
    <>
      <PageHeader eyebrow="Logbook · 04" title="Medications" description="Current medicines appear in doctor reports, grouped by the doctor who prescribed them." />

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Add medicines" description={`For ${profile.name}. Add as many as the prescription has.`} />
          <CardBody>
            <MedicinesForm current={currentForWarnings} conditions={conditionNames} />
          </CardBody>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Scan a prescription" description="Take a photo and the medicines are filled in for you to check" />
          <CardBody>
            <PrescriptionScanner current={currentForWarnings} conditions={conditionNames} aiReading={Boolean(getEnv().GEMINI_API_KEY)} />
          </CardBody>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title={`Current medicines (${current.length})`} />
        {current.length === 0 ? (
          <EmptyState title="No current medicines" description="Add what you take so it appears on reports." />
        ) : (
          <CardBody className="space-y-6">
            {byPrescription(current).map((g) => (
              <section key={g.title + g.meta}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-ink">{g.title}</h3>
                    {g.meta ? <p className="text-[13px] text-ink-3">{g.meta}</p> : null}
                  </div>
                  {g.prescription ? (
                    <PrescriptionEditButton
                      prescription={{
                        id: g.prescription.id,
                        doctorName: g.prescription.doctorName,
                        doctorSpecialty: g.prescription.doctorSpecialty,
                        issuedOn: ymd(g.prescription.issuedOn),
                        condition: g.prescription.condition,
                      }}
                      conditions={conditionNames}
                    />
                  ) : null}
                </div>
                <ul className="mt-1 divide-y divide-line-soft">
                  {g.meds.map((m) => (
                    <MedicineRow key={m.id} m={m} tz={tz} />
                  ))}
                </ul>
              </section>
            ))}
          </CardBody>
        )}
      </Card>

      {past.length ? (
        <Card>
          <details>
            <summary className="cursor-pointer list-none px-4 py-4 sm:px-5">
              <span className="text-base font-semibold text-ink">Past medicines ({past.length})</span>
              <span className="ml-2 text-[13px] text-ink-3">Finished or stopped — tap to show</span>
            </summary>
            <CardBody className="border-t border-line-soft pt-2">
              <ul className="divide-y divide-line-soft">
                {past.map((m) => (
                  <MedicineRow key={m.id} m={m} tz={tz} />
                ))}
              </ul>
            </CardBody>
          </details>
        </Card>
      ) : null}
    </>
  );
}
