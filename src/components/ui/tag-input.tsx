"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Several values in one field (e.g. conditions): pick from suggestions or type a new one and
 * press Enter / comma. Each value shows as a removable tag; Backspace on an empty box removes the last.
 */
export function TagInput({
  value,
  onChange,
  suggestions,
  placeholder,
  id,
  ...aria
}: {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: readonly string[];
  placeholder?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const chosen = new Set(value.map((v) => v.toLowerCase()));
  const shown = suggestions.filter((s) => !chosen.has(s.toLowerCase()) && (!text || s.toLowerCase().includes(text.trim().toLowerCase()))).slice(0, 12);

  function add(raw: string) {
    const v = raw.trim().replace(/,+$/, "").trim();
    if (v.length > 1 && !chosen.has(v.toLowerCase())) onChange([...value, v]);
    setText("");
    setActive(-1);
    inputRef.current?.focus();
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1.5 transition-colors focus-within:border-ink hover:border-line-strong sm:min-h-10",
          aria["aria-invalid"] && "border-sev-critical",
        )}
      >
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-2.5 pr-1 text-[13px] text-accent-ink">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((x) => x !== v));
              }}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-accent/15"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          {...aria}
          ref={inputRef}
          id={id}
          value={text}
          placeholder={value.length ? "Add another…" : placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && shown.length > 0}
          aria-controls={listId}
          className="h-8 min-w-[8rem] flex-1 bg-transparent px-1 text-base text-ink placeholder:text-ink-3/70 focus:outline-none sm:text-[15px]"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            if (e.target.value.endsWith(",")) return add(e.target.value);
            setText(e.target.value);
            setOpen(true);
          }}
          onBlur={() => text.trim() && add(text)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (active >= 0 && shown[active]) add(shown[active]);
              else if (text.trim()) add(text);
            } else if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1));
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, shown.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>
      {open && shown.length > 0 ? (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-40 mt-1 max-h-60 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)]">
          {shown.map((s, i) => (
            <li key={s} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // keep focus in the box so blur doesn't add the half-typed text
                onMouseEnter={() => setActive(i)}
                onClick={() => add(s)}
                className={cn("w-full rounded-md px-3 py-2 text-left text-[14px]", i === active ? "bg-accent-soft" : "hover:bg-sunken")}
              >
                {s}
              </button>
            </li>
          ))}
          {text.trim() && !suggestions.some((s) => s.toLowerCase() === text.trim().toLowerCase()) ? (
            <li className="px-3 pb-1 pt-2 text-[12px] text-ink-3">Press Enter to add “{text.trim()}”</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
