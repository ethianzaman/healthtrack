import "server-only";
import { randomUUID } from "node:crypto";
import type { LabFileType } from "@/domain/lab-reports";
import { logger } from "@/server/logger";
import { labReportRepository, type LabFileMeta } from "@/server/repositories/lab-report.repository";
import { cloudStorage } from "@/server/storage/file-storage";

const EXT: Record<LabFileType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Signed links live this long; pages re-request them through our route, which checks access first. */
const LINK_SECONDS = 300;

/**
 * Where test report files live. With Supabase configured, files go to a private bucket and the
 * database keeps only their location; otherwise the bytes are stored in the database.
 * Callers check ownership before calling (routes and actions do).
 */
export const labFileService = {
  usesCloud: () => cloudStorage() !== null,

  async save(o: {
    owner: { userId: string; profileId: string };
    reportId: string;
    position: number;
    name: string;
    type: LabFileType;
    bytes: Uint8Array;
    /** Small JPEG preview made in the browser (images only). */
    thumb?: Uint8Array | null;
  }) {
    const storage = cloudStorage();
    if (!storage) {
      return labReportRepository.addFile(o.reportId, { name: o.name, mimeType: o.type, bytes: o.bytes, position: o.position });
    }
    const id = randomUUID().replace(/-/g, "");
    const folder = `${o.owner.userId}/${o.owner.profileId}/${o.reportId}`;
    const storageKey = `${folder}/${id}.${EXT[o.type]}`;
    const thumbKey = o.thumb ? `${folder}/${id}-thumb.jpg` : null;
    await storage.put(storageKey, o.bytes, o.type);
    try {
      if (thumbKey && o.thumb) await storage.put(thumbKey, o.thumb, "image/jpeg");
      return await labReportRepository.addStoredFile(o.reportId, { id, name: o.name, mimeType: o.type, size: o.bytes.length, position: o.position, storageKey, thumbKey });
    } catch (error) {
      await this.purge([storageKey, ...(thumbKey ? [thumbKey] : [])]);
      throw error;
    }
  },

  /** Response for a file the caller may see: a redirect to a short-lived link, or the bytes themselves. */
  async respond(file: LabFileMeta, o: { download?: boolean; thumb?: boolean } = {}) {
    const storage = cloudStorage();
    if (file.storageKey && storage) {
      const key = o.thumb && file.thumbKey ? file.thumbKey : file.storageKey;
      const url = await storage.signedUrl(key, LINK_SECONDS, o.download ? file.name : undefined);
      return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, max-age=240", "Referrer-Policy": "no-referrer" } });
    }
    if (file.storageKey) return new Response("File storage is not configured", { status: 503 });
    const bytes = await labReportRepository.readFile(file.id);
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `${o.download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        // An image can't run anything; the type was verified from its bytes at upload.
        ...(file.mimeType.startsWith("image/") ? { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" } : {}),
      },
    });
  },

  /** Deletes cloud files; never throws (a leftover file is logged, the user's delete still succeeds). */
  async purge(keys: string[]) {
    const storage = cloudStorage();
    if (!storage || !keys.length) return;
    try {
      await storage.remove(keys);
    } catch (error) {
      logger.error("Could not delete stored files", { count: keys.length, error: String(error) });
    }
  },

  /** Runs a database delete, then removes the matching cloud files. */
  async deleteWith<T>(where: Parameters<typeof labReportRepository.storageKeys>[0], remove: () => Promise<T>): Promise<T> {
    const keys = cloudStorage() ? await labReportRepository.storageKeys(where) : [];
    const result = await remove();
    await this.purge(keys);
    return result;
  },

  /** Daily: keeps a free Supabase project from pausing. */
  async keepAlive() {
    try {
      await cloudStorage()?.ping();
    } catch (error) {
      logger.error("Storage keep-alive failed", { error: String(error) });
    }
  },
};
