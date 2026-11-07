import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { classifyBloodPressure } from "@/domain/blood-pressure";
import { ARM_LABELS, TIME_OF_DAY_LABELS } from "@/domain/enums";
import type { BloodPressureReading } from "@/generated/prisma/client";
import { formatDateTime } from "@/lib/dates";
import { deleteBpReading } from "../actions";

export function BpTable({ readings, timeZone, editable = false }: { readings: BloodPressureReading[]; timeZone: string; editable?: boolean }) {
  const columns: Column<BloodPressureReading>[] = [
    { header: "When", cell: (r) => formatDateTime(r.measuredAt, timeZone), className: "whitespace-nowrap font-mono text-[12px] text-ink-3", mobile: "title" },
    { header: "Period", cell: (r) => TIME_OF_DAY_LABELS[r.timeOfDay] },
    {
      header: "Reading",
      cell: (r) => (
        <span className="font-mono text-[15px] font-medium tabular-nums text-ink">
          {r.systolic}/{r.diastolic}
          <span className="ml-1 text-xs font-normal text-ink-3">mmHg</span>
        </span>
      ),
    },
    { header: "Pulse", cell: (r) => (r.pulse != null ? `${r.pulse} bpm` : "-"), className: "font-mono text-[13px] tabular-nums" },
    {
      header: "Status",
      cell: (r) => {
        const c = classifyBloodPressure(r.systolic, r.diastolic);
        return <SeverityBadge severity={c.severity}>{c.label}</SeverityBadge>;
      },
    },
    { header: "Arm", cell: (r) => (r.arm ? ARM_LABELS[r.arm] : "-"), className: "hidden md:table-cell", mobile: "hide" },
    { header: "Note", cell: (r) => (r.note ? <span className="line-clamp-2 max-w-48 text-ink-3">{r.note}</span> : null), className: "hidden lg:table-cell" },
  ];

  if (editable) {
    columns.push({
      header: "",
      className: "w-10 text-right",
      cell: (r) => (
        <ActionButton action={deleteBpReading.bind(null, { id: r.id })} confirm="Delete this reading?" size="icon" label="Delete reading">
          <Trash2 className="h-4 w-4 text-ink-3" />
        </ActionButton>
      ),
    });
  }

  return <DataTable columns={columns} rows={readings} empty={<EmptyState title="No readings yet" description="Your blood pressure readings will appear here." />} />;
}
