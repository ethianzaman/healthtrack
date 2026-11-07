"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

/**
 * Runs a (bound) server action on click, with optional confirmation.
 * Used for delete / revoke / toggle buttons across features.
 */
export function ActionButton({
  action,
  confirm,
  children,
  variant = "ghost",
  size = "sm",
  label,
}: {
  action: () => Promise<ActionResult<unknown>>;
  confirm?: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "icon" | "md";
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      loading={pending}
      aria-label={label}
      title={label}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        startTransition(async () => {
          const result = await action();
          if (!result.ok) window.alert(result.error);
          router.refresh();
        });
      }}
    >
      {pending ? null : children}
    </Button>
  );
}
