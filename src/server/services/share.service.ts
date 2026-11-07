import "server-only";
import { getEnv } from "@/config/env";
import { planLimits } from "@/config/plans";
import type { ShareLinkInput } from "@/features/sharing/schemas";
import type { AppContext } from "@/server/auth/context";
import { AppError, notFound } from "@/server/errors";
import { profileRepository } from "@/server/repositories/profile.repository";
import { shareLinkRepository } from "@/server/repositories/share-link.repository";
import { generateToken, hashToken } from "@/server/security/tokens";

const DAY_MS = 86_400_000;

export const shareService = {
  list: shareLinkRepository.list,

  /** Returns the full URL once; only its hash is persisted. */
  async create({ user, profile }: AppContext, input: ShareLinkInput) {
    const { maxActiveShareLinks, label } = planLimits(user.plan);
    const profileIds = (await profileRepository.listByUser(user.id)).map((p) => p.id);
    if ((await shareLinkRepository.countActive(profileIds)) >= maxActiveShareLinks) {
      throw new AppError(
        `The ${label} plan allows ${maxActiveShareLinks} active share link(s). Revoke one or upgrade.`,
        "PLAN_LIMIT",
      );
    }
    const token = generateToken();
    await shareLinkRepository.create({
      profileId: profile.id,
      tokenHash: hashToken(token),
      label: input.label,
      expiresAt: new Date(Date.now() + input.expiresInDays * DAY_MS),
    });
    return { url: `${getEnv().APP_URL}/share/${token}` };
  },

  async revoke(profileId: string, id: string) {
    if (!(await shareLinkRepository.revokeForProfile(id, profileId))) throw notFound("Share link");
  },

  /** Resolve a public token to its profile, or null if invalid/expired/revoked. */
  async resolve(token: string) {
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
    const link = await shareLinkRepository.findActiveByHash(hashToken(token));
    if (!link) return null;
    await shareLinkRepository.touch(link.id);
    return { link, profile: link.profile, timezone: link.profile.user.timezone };
  },
};
