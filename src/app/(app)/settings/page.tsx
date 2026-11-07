import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { planLimits } from "@/config/plans";
import { createProfile, deleteProfile, updateActiveProfile } from "@/features/profiles/actions";
import { AccountForm } from "@/features/profiles/components/account-form";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import type { ProfileInput } from "@/features/profiles/schemas";
import type { Profile } from "@/generated/prisma/client";
import { requireAppContext } from "@/server/auth/context";
import { profileService } from "@/server/services/profile.service";

export const metadata: Metadata = { title: "Settings" };

function toFormValues(p: Profile): ProfileInput {
  return {
    name: p.name,
    relation: p.relation,
    dateOfBirth: p.dateOfBirth?.toISOString().slice(0, 10),
    gender: p.gender ?? undefined,
    glucoseUnit: p.glucoseUnit,
    bpSystolicTarget: p.bpSystolicTarget,
    bpDiastolicTarget: p.bpDiastolicTarget,
    glucoseLow: p.glucoseLow,
    glucoseFastingMax: p.glucoseFastingMax,
    glucosePostMealMax: p.glucosePostMealMax,
  };
}

export default async function SettingsPage() {
  const { user, profile } = await requireAppContext();
  const profiles = await profileService.list(user.id);
  const limits = planLimits(user.plan);

  return (
    <>
      <PageHeader eyebrow="Logbook · 07" title="Settings" description="Manage patient profiles, targets and your account." />
      <div className="space-y-6">
        <Card>
          <CardHeader title={`Profile: ${profile.name}`} description="Targets are used for classification, insights and reports." />
          <CardBody>
            {/* key forces a fresh form when switching profiles */}
            <ProfileForm key={profile.id} action={updateActiveProfile} defaultValues={toFormValues(profile)} submitLabel="Save profile" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Family profiles"
            description={`Track parents or other family members from one account (${profiles.length}/${limits.maxProfiles} on ${limits.label}).`}
          />
          <ul className="divide-y divide-line-soft">
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>
                  <span className="font-medium text-ink">{p.name}</span> <span className="text-ink-3">· {p.relation}</span>
                  {p.isDefault ? <span className="eyebrow ml-2">primary</span> : null}
                </span>
                {!p.isDefault ? (
                  <ActionButton action={deleteProfile.bind(null, { id: p.id })} confirm={`Delete ${p.name} and ALL their readings?`} size="icon" label="Delete profile">
                    <Trash2 className="h-4 w-4 text-ink-3" />
                  </ActionButton>
                ) : null}
              </li>
            ))}
          </ul>
          {profiles.length < limits.maxProfiles ? (
            <CardBody className="border-t border-line">
              <h3 className="mb-4 font-display text-[17px] text-ink">Add a family member</h3>
              <ProfileForm action={createProfile} submitLabel="Add profile" resetOnSuccess />
            </CardBody>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Account" />
          <CardBody>
            <AccountForm defaultValues={{ name: user.name, timezone: user.timezone }} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
