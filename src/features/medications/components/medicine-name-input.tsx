"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

export interface CatalogMatch {
  brand: string;
  generic: string;
  form: string;
  company: string;
  strengths: string[];
}

/**
 * Medicine name with suggestions from the DGDA list of registered medicines in Bangladesh.
 * Free text always works (imported or unlisted medicines); picking a suggestion also fills
 * the generic name, the dosage form and the strengths that brand comes in.
 */
export function MedicineNameInput({
  name,
  value,
  onChange,
  onPick,
  inputProps,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onPick: (match: CatalogMatch) => void;
  inputProps: { id: string; "aria-invalid": boolean; "aria-describedby"?: string };
}) {
  const [matches, setMatches] = useState<CatalogMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Debounced search; only for what the user typed (not after a pick).
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) return;
        const { matches } = (await res.json()) as { matches: CatalogMatch[] };
        setMatches(matches);
        setActive(-1);
        setOpen(true);
      } catch {
        /* aborted or offline: typing still works */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function pick(m: CatalogMatch) {
    onPick(m);
    setOpen(false);
    setMatches([]);
  }

  const showList = open && matches.length > 0 && query.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative">
      <Input
        {...inputProps}
        name={name}
        value={value}
        autoComplete="off"
        placeholder="Start typing, e.g. Amdocal or Amlodipine"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
          if (e.target.value.trim().length < 2) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList ? (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)]">
          {matches.map((m, i) => (
            <li key={`${m.brand}-${m.generic}-${m.form}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(m)}
                className={cn("w-full rounded-md px-3 py-2 text-left", i === active ? "bg-accent-soft" : "hover:bg-sunken")}
              >
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-ink">{m.brand}</span>
                  <span className="text-[12px] text-ink-3">{m.form}</span>
                </span>
                <span className="block text-[13px] text-ink-2">{m.generic}</span>
                <span className="block text-[12px] text-ink-3">
                  {m.strengths.slice(0, 5).join(" · ")}
                  {m.strengths.length > 5 ? " …" : ""}
                  {m.company ? ` — ${m.company}` : ""}
                </span>
              </button>
            </li>
          ))}
          <li className="px-3 pb-1 pt-2 text-[11px] text-ink-3">From the DGDA list of registered medicines. Not listed? Just type the name.</li>
        </ul>
      ) : null}
    </div>
  );
}
