-- Additive only: no existing table is copied, dropped or rewritten, so no data can be lost.

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "doctorName" TEXT,
    "issuedOn" DATETIME,
    "condition" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prescription_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Prescription_profileId_issuedOn_idx" ON "Prescription"("profileId", "issuedOn");

-- AlterTable (new nullable columns; existing rows get NULL)
ALTER TABLE "Medication" ADD COLUMN "condition" TEXT;
ALTER TABLE "Medication" ADD COLUMN "prescriptionId" TEXT REFERENCES "Prescription" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Medication_prescriptionId_idx" ON "Medication"("prescriptionId");
