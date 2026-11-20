import type { AccountStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const STYLES: Record<AccountStatus, string> = {
  ACTIVE: "bg-sev-normal-bg text-sev-normal",
  WARNED: "bg-sev-elevated-bg text-sev-elevated",
  SUSPENDED: "bg-sev-critical-bg text-sev-critical",
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <span className={cn("inline-flex rounded px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider", STYLES[status])}>{status.toLowerCase()}</span>;
}
