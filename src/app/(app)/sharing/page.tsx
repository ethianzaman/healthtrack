import type { Metadata } from "next";
import { ActionButton } from "@/components/action-button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { revokeShareLink } from "@/features/sharing/actions";
import { ShareLinkForm } from "@/features/sharing/components/share-link-form";
import type { ShareLink } from "@/generated/prisma/client";
import { formatDateTime } from "@/lib/dates";
import { requireAppContext } from "@/server/auth/context";
import { shareService } from "@/server/services/share.service";

export const metadata: Metadata = { title: "Doctor sharing" };

function linkStatus(link: ShareLink, now: number) {
  if (link.revokedAt) return { label: "Revoked", severity: "low" as const };
  if (link.expiresAt.getTime() <= now) return { label: "Expired", severity: "elevated" as const };
  return { label: "Active", severity: "normal" as const };
}

export default async function SharingPage() {
  const { user, profile } = await requireAppContext();
  const links = await shareService.list(profile.id);
  const tz = user.timezone;
  // eslint-disable-next-line react-hooks/purity -- request-time render, not a client component
  const now = Date.now();

  return (
    <>
      <PageHeader
        eyebrow="Logbook · 06"
        title="Doctor access"
        description={`Give your doctor a secure, read-only link to ${profile.name}'s last 90 days - no account needed.`}
      />
      <Card className="mb-6">
        <CardHeader title="Create a share link" />
        <CardBody>
          <ShareLinkForm />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Links" />
        <DataTable<ShareLink>
          rows={links}
          empty={<EmptyState title="No links shared yet" description="Create one before your next appointment." />}
          columns={[
            { header: "For", cell: (l) => <span className="font-medium text-ink">{l.label}</span> },
            {
              header: "Status",
              cell: (l) => {
                const s = linkStatus(l, now);
                return <SeverityBadge severity={s.severity}>{s.label}</SeverityBadge>;
              },
            },
            { header: "Expires", cell: (l) => formatDateTime(l.expiresAt, tz), className: "whitespace-nowrap" },
            { header: "Last viewed", cell: (l) => (l.lastAccessedAt ? formatDateTime(l.lastAccessedAt, tz) : "Never"), className: "hidden md:table-cell" },
            {
              header: "",
              className: "text-right",
              cell: (l) =>
                linkStatus(l, now).label === "Active" ? (
                  <ActionButton action={revokeShareLink.bind(null, { id: l.id })} confirm="Revoke this link? The doctor will lose access." variant="danger">
                    Revoke
                  </ActionButton>
                ) : null,
            },
          ]}
        />
      </Card>
    </>
  );
}
