"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ConditionStatus } from "@/domain/conditions";
import { cn } from "@/lib/utils";
import { deleteCondition, setConditionStatus } from "../actions";
import type { ConditionInput } from "../schemas";
import { ConditionForm } from "./condition-form";

export interface ConditionView {
  id: string;
  name: string;
  status: ConditionStatus;
  sinceLabel: string | null;
  resolvedLabel: string | null;
  doctorName: string | null;
  notes: string | null;
  /** Current medicines whose condition text names this condition. */
  medicines: string[];
  /** Values for the edit form. */
  form: Partial<ConditionInput>;
}

export function ConditionCard({ c }: { c: ConditionView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok && r.error) window.alert(r.error);
      router.refresh();
    });

  if (editing) {
    return (
      <li className="rounded-xl border border-line p-4">
        <ConditionForm
          initial={c.form}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </li>
    );
  }

  const ongoing = c.status === "ONGOING";
  return (
    <li className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", ongoing ? "bg-accent" : "bg-line-strong")} aria-hidden />
            <span className="text-[16px] font-semibold text-ink">{c.name}</span>
            <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider", ongoing ? "bg-sev-normal-bg text-sev-normal" : "bg-sunken text-ink-3")}>
              {ongoing ? "Ongoing" : "Resolved"}
            </span>
          </p>
          <p className="mt-1 text-[13px] text-ink-3">
            {[c.sinceLabel ? `Since ${c.sinceLabel}` : null, c.resolvedLabel ? `Resolved ${c.resolvedLabel}` : null, c.doctorName].filter(Boolean).join(" · ") || "No dates recorded"}
          </p>
          {c.notes ? <p className="mt-1 text-[13px] text-ink-2">{c.notes}</p> : null}
          {ongoing ? (
            <p className="mt-2 text-[13px]">
              <span className="text-ink-3">Current medicines: </span>
              <span className="text-ink">{c.medicines.length ? c.medicines.join(", ") : "none linked yet"}</span>
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="secondary" loading={pending} onClick={() => run(() => setConditionStatus({ id: c.id, status: ongoing ? "RESOLVED" : "ONGOING" }))}>
            {ongoing ? "Mark resolved" : "Reopen"}
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 text-ink-3" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Delete ${c.name}`}
            disabled={pending}
            onClick={() => window.confirm(`Delete ${c.name} from the list? Medicines are not affected.`) && run(() => deleteCondition({ id: c.id }))}
          >
            <Trash2 className="h-4 w-4 text-ink-3" />
          </Button>
        </div>
      </div>
    </li>
  );
}
