-- Additive only: no existing table is copied, dropped or rewritten, so no data can be lost.

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN "endDate" DATETIME;
ALTER TABLE "Medication" ADD COLUMN "form" TEXT;
ALTER TABLE "Medication" ADD COLUMN "generic" TEXT;
ALTER TABLE "Medication" ADD COLUMN "mealTiming" TEXT;
ALTER TABLE "Medication" ADD COLUMN "startDate" DATETIME;
ALTER TABLE "Medication" ADD COLUMN "stopReason" TEXT;
ALTER TABLE "Medication" ADD COLUMN "stoppedAt" DATETIME;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN "doctorSpecialty" TEXT;

-- CreateTable
CREATE TABLE "MedicineCatalog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brand" TEXT NOT NULL,
    "brandKey" TEXT NOT NULL,
    "generic" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "dar" TEXT
);

-- CreateIndex
CREATE INDEX "MedicineCatalog_brandKey_idx" ON "MedicineCatalog"("brandKey");

-- CreateIndex
CREATE INDEX "MedicineCatalog_generic_idx" ON "MedicineCatalog"("generic");

-- Existing medicines: their course started when they were added; already-stopped ones get a stop date.
UPDATE "Medication" SET "startDate" = "createdAt" WHERE "startDate" IS NULL;
UPDATE "Medication" SET "stoppedAt" = "updatedAt" WHERE "active" = false AND "stoppedAt" IS NULL;
