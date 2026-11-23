import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { treats, type ConditionStatus } from "@/domain/conditions";
import { ConditionCard, type ConditionView } from "@/features/conditions/components/condition-card";
import { ConditionForm } from "@/features/conditions/components/condition-form";
import { formatDate, toZonedYmd } from "@/lib/dates";
import { requireAppContext } from "@/server/auth/context";
import { conditionRepository } from "@/server/repositories/condition.repository";
import { medicationRepository } from "@/server/repositories/medication.repository";

export const metadata: Metadata = { title: "Health conditions" };

export default async function ConditionsPage() {
  const { profile } = await requireAppContext();
  const [conditions, current] = await Promise.all([conditionRepository.list(profile.id), medicationRepository.listCurrent(profile.id)]);
  // Diagnosis dates are calendar dates stored at UTC midnight.
  const label = (d: Date | null) => (d ? formatDate(d, "UTC") : null);
  const ymd = (d: Date | null) => (d ? toZonedYmd(d, "UTC") : undefined);

  const views: ConditionView[] = conditions.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status as ConditionStatus,
    sinceLabel: label(c.diagnosedOn),
    resolvedLabel: label(c.resolvedOn),
    doctorName: c.doctorName,
    notes: c.notes,
    medicines: current.filter((m) => treats(m.condition, c.name)).map((m) => [m.name, m.dosage].filter(Boolean).join(" ")),
    form: {
      id: c.id,
      name: c.name,
      status: c.status as ConditionStatus,
      diagnosedOn: ymd(c.diagnosedOn),
      resolvedOn: ymd(c.resolvedOn),
      doctorName: c.doctorName ?? undefined,
      notes: c.notes ?? undefined,
    },
  }));
  const ongoing = views.filter((v) => v.status === "ONGOING");
  const resolved = views.filter((v) => v.status === "RESOLVED");

  return (
    <>
      <PageHeader
        eyebrow="Logbook · 06"
        title="Health conditions"
        description="What is being treated or watched. Conditions you name on a prescription are added here automatically."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit">
          <CardHeader title="Add a condition" description={`For ${profile.name}`} />
          <CardBody>
            <ConditionForm />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={`Ongoing (${ongoing.length})`} />
            <CardBody>
              {ongoing.length ? (
                <ul className="space-y-3">
                  {ongoing.map((c) => (
                    <ConditionCard key={c.id} c={c} />
                  ))}
                </ul>
              ) : (
                <EmptyState title="No ongoing conditions" description="Add a diagnosis, or name it when adding a prescription." />
              )}
            </CardBody>
          </Card>
          {resolved.length ? (
            <Card>
              <CardHeader title={`Resolved (${resolved.length})`} />
              <CardBody>
                <ul className="space-y-3">
                  {resolved.map((c) => (
                    <ConditionCard key={c.id} c={c} />
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
