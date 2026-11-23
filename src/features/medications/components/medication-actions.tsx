"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteMedication, resumeMedication, stopMedication } from "../actions";

/** Stop (with an optional reason, e.g. "Dr. Rina replaced it"), resume or delete one medicine. */
export function MedicationActions({ id, name, stopped }: { id: string; name: string; stopped: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const result = await fn();
      if (!result.ok && result.error) window.alert(result.error);
      router.refresh();
    });

  return (
    <div className="flex items-center gap-1">
      {stopped ? (
        <Button type="button" size="sm" variant="secondary" loading={pending} onClick={() => run(() => resumeMedication({ id }))}>
          Resume
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={pending}
          onClick={() => {
            const reason = window.prompt(`Stop ${name}? Optional: why (e.g. "Dr. Rina changed it")`, "");
            if (reason === null) return;
            run(() => stopMedication({ id, reason: reason.trim() || undefined }));
          }}
        >
          Stop
        </Button>
      )}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={`Delete ${name}`}
        disabled={pending}
        onClick={() => window.confirm(`Delete ${name} completely? Use Stop instead to keep it in the history.`) && run(() => deleteMedication({ id }))}
      >
        <Trash2 className="h-4 w-4 text-ink-3" />
      </Button>
    </div>
  );
}
