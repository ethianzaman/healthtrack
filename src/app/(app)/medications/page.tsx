import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { deleteMedication, toggleMedication } from "@/features/medications/actions";
import { MedicationForm } from "@/features/medications/components/medication-form";
import type { Medication } from "@/generated/prisma/client";
import { requireAppContext } from "@/server/auth/context";
import { medicationRepository } from "@/server/repositories/medication.repository";

export const metadata: Metadata = { title: "Medications" };

export default async function MedicationsPage() {
  const { profile } = await requireAppContext();
  const medications = await medicationRepository.list(profile.id);

  return (
    <>
      <PageHeader eyebrow="Logbook · 04" title="Medications" description="Active medications are included in doctor reports." />
      <Card className="mb-6">
        <CardHeader title="Add medication" description={`For ${profile.name}`} />
        <CardBody>
          <MedicationForm />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Medication list" />
        <DataTable<Medication>
          rows={medications}
          empty={<EmptyState title="No medicines recorded yet" description="Add what you take daily so it appears on reports." />}
          columns={[
            { header: "Medicine", cell: (m) => <span className="font-medium text-ink">{m.name}</span> },
            { header: "Dosage", cell: (m) => <span className="font-mono text-[13px]">{m.dosage}</span> },
            { header: "Schedule", cell: (m) => m.schedule },
            { header: "Notes", cell: (m) => <span className="text-ink-3">{m.notes}</span>, className: "hidden md:table-cell" },
            {
              header: "Status",
              cell: (m) => (
                <ActionButton action={toggleMedication.bind(null, { id: m.id, active: !m.active })} variant="secondary" label="Toggle status">
                  {m.active ? "Active" : "Stopped"}
                </ActionButton>
              ),
            },
            {
              header: "",
              className: "w-10 text-right",
              cell: (m) => (
                <ActionButton action={deleteMedication.bind(null, { id: m.id })} confirm={`Remove ${m.name}?`} size="icon" label="Remove">
                  <Trash2 className="h-4 w-4 text-ink-3" />
                </ActionButton>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
