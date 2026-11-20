import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/feedback";
import { ACTIVITY_LABELS, type ActivityType } from "@/domain/activity";
import { DeletionControls, ReactivateForm, SuspendForm, WarnForm } from "@/features/admin/components/account-status-form";
import { AccountStatusBadge } from "@/features/admin/components/status-badge";
import { formatDate, formatDateTime, formatRelative } from "@/lib/dates";
import { isAdminEmail, requireAdmin } from "@/server/auth/admin";
import { adminService } from "@/server/services/admin.service";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const detail = await adminService.userDetail(id);
  if (!detail) notFound();
  const { user, counts, events, actions } = detail;
  const tz = admin.timezone;
  const small = (text: string) => <span className="text-[18px] sm:text-[20px]">{text}</span>;

  return (
    <>
      <PageHeader eyebrow="Admin · User" title={user.name} description={user.email} action={<AccountStatusBadge status={user.status} />} />

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Joined" value={small(formatDate(user.createdAt, tz))} />
        <StatCard label="Last active" value={small(formatRelative(user.lastActiveAt ?? user.lastLoginAt, tz))} />
        <StatCard label="Profiles" value={counts.profiles} />
        <StatCard label="Readings" value={counts.readings} />
        <StatCard label="Medicines" value={counts.medications} hint={`${counts.prescriptions} from scans`} />
        <StatCard label="Doctor links" value={counts.shareLinks} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Activity" description="Most recent 100 events" />
          <DataTable
            rows={events}
            empty={<EmptyState title="No activity recorded yet" />}
            columns={[
              { header: "What", mobile: "title", cell: (e) => <span className="text-ink">{ACTIVITY_LABELS[e.type as ActivityType] ?? e.type}</span> },
              { header: "Detail", cell: (e) => <span className="font-mono text-[13px] uppercase">{e.detail ?? ""}</span> },
              { header: "Country", cell: (e) => e.country ?? "" },
              { header: "When", cell: (e) => <span title={formatDateTime(e.createdAt, tz)}>{formatRelative(e.createdAt, tz)}</span> },
            ]}
          />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Account status" description={user.statusReason ? `Reason: ${user.statusReason}` : undefined} />
            <CardBody className="space-y-5">
              {!user.emailVerifiedAt ? <p className="text-[13px] text-sev-elevated">Email not confirmed yet.</p> : null}
              {isAdminEmail(user.email) ? (
                <p className="text-sm text-ink-3">This is an admin account.</p>
              ) : user.status === "SUSPENDED" ? (
                <>
                  <p className="text-[13px] text-ink-2">
                    {user.deletionScheduledAt ? (
                      <>
                        Permanent deletion on <span className="font-medium text-sev-critical">{formatDate(user.deletionScheduledAt, tz)}</span>.
                      </>
                    ) : (
                      "Suspended. No deletion scheduled."
                    )}
                  </p>
                  <DeletionControls userId={user.id} scheduled={Boolean(user.deletionScheduledAt)} />
                  <hr className="border-line" />
                  <ReactivateForm userId={user.id} />
                </>
              ) : (
                <>
                  {user.status === "WARNED" ? (
                    <div className="space-y-2 text-[13px]">
                      {user.warningRespondedAt ? (
                        <div className="rounded-md border border-line bg-sunken p-3">
                          <p className="eyebrow mb-1">User replied {formatRelative(user.warningRespondedAt, tz)}</p>
                          <p className="whitespace-pre-wrap text-ink">{user.warningResponse}</p>
                        </div>
                      ) : (
                        <p className="text-ink-2">
                          Waiting for a reply until{" "}
                          <span className="font-medium text-sev-elevated">{user.warningDeadlineAt ? formatDate(user.warningDeadlineAt, tz) : "-"}</span>. No reply by then
                          means automatic suspension and deletion 30 days later.
                        </p>
                      )}
                      <ReactivateForm userId={user.id} />
                    </div>
                  ) : (
                    <WarnForm userId={user.id} />
                  )}
                  <hr className="border-line" />
                  <SuspendForm userId={user.id} />
                </>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Admin history" />
            <CardBody className="space-y-3 text-[13px]">
              {actions.length === 0 ? <p className="text-ink-3">No admin actions yet.</p> : null}
              {actions.map((a) => (
                <div key={a.id} className="border-l-2 border-line pl-3">
                  <p className="text-ink">
                    <span className="font-mono uppercase">{a.action}</span> by {a.adminEmail}
                  </p>
                  {a.reason ? <p className="text-ink-2">{a.reason}</p> : null}
                  <p className="text-ink-3">{formatDateTime(a.createdAt, tz)}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
