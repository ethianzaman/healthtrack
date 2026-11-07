"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchProfile } from "../actions";

export function ProfileSwitcher({ profiles, activeId }: { profiles: { id: string; name: string; relation: string }[]; activeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex min-w-0 items-center gap-2">
      <span className="eyebrow hidden shrink-0 sm:inline">Patient</span>
      <select
        className="h-10 w-full min-w-0 max-w-[min(62vw,280px)] appearance-none truncate rounded-md border border-line bg-surface bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22><path d=%22M1 1l4 4 4-4%22 fill=%22none%22 stroke=%22%237e786b%22 stroke-width=%221.5%22/></svg>')] bg-[position:right_10px_center] bg-no-repeat pl-3 pr-8 text-base font-medium text-ink hover:border-line-strong disabled:opacity-50 sm:text-sm"
        value={activeId}
        disabled={pending}
        aria-label="Active patient profile"
        onChange={(e) => {
          const profileId = e.target.value;
          startTransition(async () => {
            await switchProfile({ profileId });
            router.refresh();
          });
        }}
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.relation}
          </option>
        ))}
      </select>
    </label>
  );
}
