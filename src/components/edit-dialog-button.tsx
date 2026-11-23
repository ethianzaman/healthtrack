"use client";

import { Pencil } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/** Pencil button that opens a dialog; `children` gets a `close` callback for the form inside. */
export function EditDialogButton({
  title,
  label,
  children,
  text,
}: {
  title: string;
  /** Accessible name of the icon button. */
  label: string;
  children: (close: () => void) => ReactNode;
  /** Show a text button ("Edit") instead of the bare icon. */
  text?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button type="button" size={text ? "sm" : "icon"} variant={text ? "secondary" : "ghost"} aria-label={label} title={label} onClick={() => setOpen(true)}>
        <Pencil className={text ? "h-3.5 w-3.5" : "h-4 w-4 text-ink-3"} />
        {text}
      </Button>
      <Dialog open={open} onClose={close} title={title}>
        {children(close)}
      </Dialog>
    </>
  );
}
