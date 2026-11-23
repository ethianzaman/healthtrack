"use client";

import { EditDialogButton } from "@/components/edit-dialog-button";
import type { GlucoseUnit } from "@/domain/enums";
import type { GlucoseTargets } from "@/domain/glucose";
import type { GlucoseReading } from "@/generated/prisma/client";
import { GlucoseForm } from "./glucose-form";

export function GlucoseEditButton({ reading, unit, targets }: { reading: GlucoseReading; unit: GlucoseUnit; targets: GlucoseTargets }) {
  return (
    <EditDialogButton title="Edit glucose reading" label="Edit reading">
      {(close) => <GlucoseForm reading={reading} unit={unit} targets={targets} onDone={close} />}
    </EditDialogButton>
  );
}
