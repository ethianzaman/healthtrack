-- Additive only: three new tables for test reports, nothing existing is changed.

-- CreateTable
CREATE TABLE "LabReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "testDate" DATETIME,
    "labName" TEXT,
    "prescriptionId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LabReport_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LabReport_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabReportFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LabReportFile_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LabReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabReportFileChunk" (
    "fileId" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "data" BLOB NOT NULL,

    PRIMARY KEY ("fileId", "idx"),
    CONSTRAINT "LabReportFileChunk_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "LabReportFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LabReport_profileId_testDate_idx" ON "LabReport"("profileId", "testDate");

-- CreateIndex
CREATE INDEX "LabReport_prescriptionId_idx" ON "LabReport"("prescriptionId");

-- CreateIndex
CREATE INDEX "LabReportFile_reportId_idx" ON "LabReportFile"("reportId");
