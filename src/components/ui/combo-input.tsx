"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "block h-11 w-full rounded-md border border-line bg-surface pl-3 pr-9 text-base text-ink placeholder:text-ink-3/70 transition-colors hover:border-line-strong focus:border-ink focus:outline-none sm:h-10 sm:text-[15px] aria-invalid:border-sev-critical aria-invalid:bg-sev-critical-bg/30";

/**
 * One field that is both a dropdown and a text box: pick a suggestion or type anything.
 * Suggestions filter as you type; arrow keys + Enter pick, Escape closes.
 */
export function ComboInput({
  value,
  onChange,
  options,
  placeholder,
  mono,
  id,
  name,
  className,
  ...aria
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  /** Monospace text for codes like 1+0+1. */
  mono?: boolean;
  id?: string;
  name?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  // While typing, narrow the list; when just opened, show everything.
  const shown = filter ? options.filter((o) => o.toLowerCase().includes(filter.toLowerCase())) : options;

  function pick(option: string) {
    onChange(option);
    setFilter("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input
        {...aria}
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && shown.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        className={cn(fieldBase, mono && "font-mono tabular-nums")}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setFilter(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && active >= 0 && shown[active]) {
            e.preventDefault();
            pick(shown[active]);
          } else if (e.key === "Escape" || e.key === "Tab") {
            setOpen(false);
          }
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Show options"
        onClick={() => {
          setFilter("");
          setOpen((o) => !o);
        }}
        className="absolute right-0 top-0 flex h-full w-9 items-center justify-center text-ink-3 hover:text-ink"
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && shown.length > 0 ? (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-40 mt-1 max-h-60 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)]">
          {shown.map((o, i) => (
            <li key={o} role="option" aria-selected={o === value}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o)}
                className={cn(
                  "flex w-full items-center rounded-md px-3 py-2 text-left text-[14px]",
                  mono && "font-mono tabular-nums",
                  i === active ? "bg-accent-soft" : "hover:bg-sunken",
                  o === value && "font-semibold text-accent",
                )}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
