"use client";

import { EditDialogButton } from "@/components/edit-dialog-button";
import type { BloodPressureReading } from "@/generated/prisma/client";
import { BpForm } from "./bp-form";

export function BpEditButton({ reading }: { reading: BloodPressureReading }) {
  return (
    <EditDialogButton title="Edit blood pressure reading" label="Edit reading">
      {(close) => <BpForm reading={reading} onDone={close} />}
    </EditDialogButton>
  );
}
