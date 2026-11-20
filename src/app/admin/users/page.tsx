import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form-controls";
import { AccountStatusBadge } from "@/features/admin/components/status-badge";
import type { AccountStatus } from "@/generated/prisma/enums";
import { formatDate, formatRelative } from "@/lib/dates";
import { requireAdmin } from "@/server/auth/admin";
import { adminService } from "@/server/services/admin.service";

const PAGE_SIZE = 50;
const STATUSES: AccountStatus[] = ["ACTIVE", "WARNED", "SUSPENDED"];

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const status = STATUSES.includes(sp.status as AccountStatus) ? (sp.status as AccountStatus) : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const { total, users } = await adminService.listUsers({ q, status, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tz = admin.timezone;
  const link = (p: number) => {
    const params = new URLSearchParams({ page: String(p) });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    return `/admin/users?${params}`;
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="Users" description={`${total} account${total === 1 ? "" : "s"}. Counts are for the last 30 days.`} />
      <form className="mb-4 flex flex-col gap-3 sm:flex-row" role="search">
        <Input name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search name or email" className="sm:max-w-xs" />
        <Select
          name="status"
          defaultValue={status ?? ""}
          aria-label="Status"
          placeholder="All statuses"
          options={STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))}
          className="sm:max-w-44"
        />
        <button type="submit" className={buttonClasses({ variant: "secondary" })}>
          Filter
        </button>
      </form>
      <Card>
        <DataTable
          rows={users}
          empty={<EmptyState title="No accounts match" />}
          columns={[
            {
              header: "Account",
              mobile: "title",
              cell: (u) => (
                <Link href={`/admin/users/${u.id}`} className="block min-w-0 hover:underline">
                  <span className="block truncate font-medium text-ink">{u.name}</span>
                  <span className="block truncate text-[13px] text-ink-3">{u.email}</span>
                </Link>
              ),
            },
            { header: "Status", cell: (u) => <AccountStatusBadge status={u.status} /> },
            { header: "Plan", cell: (u) => u.plan.toLowerCase(), className: "capitalize" },
            { header: "Joined", cell: (u) => formatDate(u.createdAt, tz), mobile: "hide" },
            { header: "Last active", cell: (u) => formatRelative(u.lastActiveAt ?? u.lastLoginAt, tz) },
            { header: "Sign-ins", cell: (u) => <span className="font-mono tabular-nums">{u.logins30}</span>, className: "text-right" },
            { header: "Reports", cell: (u) => <span className="font-mono tabular-nums">{u.downloads30}</span>, className: "text-right" },
            { header: "Readings", cell: (u) => <span className="font-mono tabular-nums">{u.readings}</span>, className: "text-right" },
          ]}
        />
      </Card>
      {pages > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? (
            <Link href={link(page - 1)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-ink-3">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={link(page + 1)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
