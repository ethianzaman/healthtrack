import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { MEAL_TIMING_LABELS, TIME_OF_DAY_LABELS, type GlucoseUnit } from "@/domain/enums";
import { classifyGlucose, formatGlucose, type GlucoseTargets } from "@/domain/glucose";
import type { GlucoseReading } from "@/generated/prisma/client";
import { formatDateTime } from "@/lib/dates";
import { deleteGlucoseReading } from "../actions";

export function GlucoseTable({
  readings,
  unit,
  targets,
  timeZone,
  editable = false,
}: {
  readings: GlucoseReading[];
  unit: GlucoseUnit;
  targets: GlucoseTargets;
  timeZone: string;
  editable?: boolean;
}) {
  const columns: Column<GlucoseReading>[] = [
    { header: "When", cell: (r) => formatDateTime(r.measuredAt, timeZone), className: "whitespace-nowrap font-mono text-[12px] text-ink-3", mobile: "title" },
    { header: "Period", cell: (r) => TIME_OF_DAY_LABELS[r.timeOfDay] },
    { header: "Meal", cell: (r) => MEAL_TIMING_LABELS[r.mealTiming], className: "whitespace-nowrap" },
    {
      header: "Glucose",
      cell: (r) => <span className="font-mono text-[15px] font-medium tabular-nums text-ink">{formatGlucose(r.valueMgDl, unit)}</span>,
      className: "whitespace-nowrap",
    },
    {
      header: "Status",
      cell: (r) => {
        const c = classifyGlucose(r.valueMgDl, r.mealTiming, targets);
        return <SeverityBadge severity={c.severity}>{c.label}</SeverityBadge>;
      },
    },
    { header: "Note", cell: (r) => (r.note ? <span className="line-clamp-2 max-w-48 text-ink-3">{r.note}</span> : null), className: "hidden lg:table-cell" },
  ];

  if (editable) {
    columns.push({
      header: "",
      className: "w-10 text-right",
      cell: (r) => (
        <ActionButton action={deleteGlucoseReading.bind(null, { id: r.id })} confirm="Delete this reading?" size="icon" label="Delete reading">
          <Trash2 className="h-4 w-4 text-ink-3" />
        </ActionButton>
      ),
    });
  }

  return <DataTable columns={columns} rows={readings} empty={<EmptyState title="No readings yet" description="Your glucose readings will appear here." />} />;
}
