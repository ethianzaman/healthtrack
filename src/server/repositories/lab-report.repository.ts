import "server-only";
import { chunkBytes } from "@/domain/lab-reports";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

const fileMeta = { id: true, name: true, mimeType: true, size: true, storageKey: true, thumbKey: true } satisfies Prisma.LabReportFileSelect;
export type LabFileMeta = Prisma.LabReportFileGetPayload<{ select: typeof fileMeta }>;

const listInclude = {
  files: { select: fileMeta, orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
  prescription: { select: { id: true, doctorName: true, doctorSpecialty: true, issuedOn: true } },
} satisfies Prisma.LabReportInclude;

export type LabReportWithFiles = Prisma.LabReportGetPayload<{ include: typeof listInclude }>;

type ReportFields = { title: string; testDate: Date | null; labName: string | null; prescriptionId: string | null; notes: string | null };

/**
 * Test reports and their files. Every query is scoped to the profile (or, for file reads, the
 * owning user), so one account can never reach another account's reports.
 */
export const labReportRepository = {
  /** Newest test first; file metadata only (never the bytes). */
  list(profileId: string, range?: { from: Date; to: Date }) {
    return db.labReport.findMany({
      where: { profileId, ...(range ? { testDate: { gte: range.from, lt: range.to } } : {}) },
      include: listInclude,
      orderBy: [{ testDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    });
  },

  create(profileId: string, data: ReportFields) {
    return db.labReport.create({ data: { ...data, profileId }, select: { id: true } });
  },

  async updateForProfile(id: string, profileId: string, data: ReportFields) {
    const { count } = await db.labReport.updateMany({ where: { id, profileId }, data });
    return count > 0;
  },

  /** Files, chunks go with it (cascade). */
  async deleteForProfile(id: string, profileId: string) {
    const { count } = await db.labReport.deleteMany({ where: { id, profileId } });
    return count > 0;
  },

  /** Report of this profile with its current file count, or null. */
  findForProfile(id: string, profileId: string) {
    return db.labReport.findFirst({ where: { id, profileId }, select: { id: true, _count: { select: { files: true } } } });
  },

  /** Prescription belongs to the profile (so a report can't be linked to someone else's). */
  async ownsPrescription(prescriptionId: string, profileId: string) {
    return (await db.prescription.count({ where: { id: prescriptionId, profileId } })) > 0;
  },

  /** Stores the file split into chunk rows, all in one transaction (no cloud storage). */
  addFile(reportId: string, file: { name: string; mimeType: string; bytes: Uint8Array; position: number }) {
    const chunks = chunkBytes(file.bytes);
    return db.labReportFile.create({
      data: {
        reportId,
        name: file.name,
        mimeType: file.mimeType,
        size: file.bytes.length,
        position: file.position,
        chunks: { create: chunks.map((data, idx) => ({ idx, data: Buffer.from(data) })) },
      },
      select: { id: true },
    });
  },

  /** Records a file already uploaded to cloud storage: only its location is kept here. */
  addStoredFile(reportId: string, file: { id: string; name: string; mimeType: string; size: number; position: number; storageKey: string; thumbKey: string | null }) {
    return db.labReportFile.create({ data: { ...file, reportId }, select: { id: true } });
  },

  /** Cloud storage paths (files and previews) under a report, a single file, a profile or a whole account. */
  async storageKeys(where: { reportId?: string; fileId?: string; profileId?: string; userId?: string }): Promise<string[]> {
    const rows = await db.labReportFile.findMany({
      where: {
        storageKey: { not: null },
        ...(where.fileId ? { id: where.fileId } : {}),
        ...(where.reportId ? { reportId: where.reportId } : {}),
        ...(where.profileId ? { report: { profileId: where.profileId } } : {}),
        ...(where.userId ? { report: { profile: { userId: where.userId } } } : {}),
      },
      select: { storageKey: true, thumbKey: true },
    });
    return rows.flatMap((r) => [r.storageKey, r.thumbKey]).filter((k): k is string => Boolean(k));
  },

  /** File metadata if it belongs to one of the user's profiles. */
  findFileForUser(fileId: string, userId: string) {
    return db.labReportFile.findFirst({
      where: { id: fileId, report: { profile: { userId } } },
      select: fileMeta,
    });
  },

  /** File metadata if it belongs to this profile (used by doctor share links). */
  findFileForProfile(fileId: string, profileId: string) {
    return db.labReportFile.findFirst({ where: { id: fileId, report: { profileId } }, select: fileMeta });
  },

  /** The file's bytes, joined from its chunks. Call only after an ownership check. */
  async readFile(fileId: string): Promise<Uint8Array> {
    const chunks = await db.labReportFileChunk.findMany({ where: { fileId }, orderBy: { idx: "asc" }, select: { data: true } });
    const total = chunks.reduce((n, c) => n + c.data.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c.data, offset);
      offset += c.data.length;
    }
    return out;
  },

  async deleteFileForProfile(fileId: string, profileId: string) {
    const { count } = await db.labReportFile.deleteMany({ where: { id: fileId, report: { profileId } } });
    return count > 0;
  },

  /** For the report form's "which doctor asked for it" list. */
  prescriptionsForPicker(profileId: string) {
    return db.prescription.findMany({
      where: { profileId },
      select: { id: true, doctorName: true, doctorSpecialty: true, issuedOn: true, condition: true },
      orderBy: [{ issuedOn: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    });
  },
};
