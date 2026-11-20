"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared open/close behaviour for field pickers (date, time): toggles from a trigger button,
 * closes on outside click or Escape (returning focus to the field), and flips to the right
 * edge when there's no room on the left.
 */
export function usePickerPopover(panelWidth: number) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return {
    open,
    alignRight,
    rootRef,
    triggerRef,
    panelId,
    toggle() {
      const rect = triggerRef.current?.getBoundingClientRect();
      setAlignRight(Boolean(rect && rect.left + panelWidth > window.innerWidth - 8));
      setOpen((o) => !o);
    },
    close(refocus = true) {
      setOpen(false);
      if (refocus) triggerRef.current?.focus();
    },
  };
}

/** Field-looking trigger button styles, shared so every picker matches the text inputs. */
export function pickerTriggerClasses(open: boolean) {
  return cn(
    "flex h-11 w-full items-center gap-2.5 rounded-md border border-line bg-surface px-3 text-left text-base transition-colors hover:border-line-strong focus:border-ink focus:outline-none sm:h-10 sm:text-[15px]",
    "aria-invalid:border-sev-critical aria-invalid:bg-sev-critical-bg/30",
    open && "border-ink",
  );
}

/**
 * The picker surface. Phones: a bottom sheet above the tab bar with a dimmed backdrop.
 * Larger screens: a popover under the field.
 */
export function PickerPanel({
  id,
  label,
  alignRight,
  widthClass,
  onDismiss,
  children,
}: {
  id: string;
  label: string;
  alignRight: boolean;
  /** Tailwind width for sm+ screens, e.g. "sm:w-76". */
  widthClass: string;
  onDismiss: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-70 bg-ink/30 sm:hidden" aria-hidden onPointerDown={onDismiss} />
      <div
        id={id}
        role="dialog"
        aria-label={label}
        className={cn(
          "z-80 border border-line bg-surface p-3",
          "fixed inset-x-0 bottom-0 rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.3)]",
          "sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:rounded-xl sm:pb-3 sm:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)]",
          widthClass,
          alignRight ? "sm:right-0" : "sm:left-0",
        )}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        {children}
      </div>
    </>
  );
}
