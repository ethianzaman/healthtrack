-- Additive only: where a test report file lives in cloud storage (null = in the database, as before).

-- AlterTable
ALTER TABLE "LabReportFile" ADD COLUMN "storageKey" TEXT;

-- AlterTable
ALTER TABLE "LabReportFile" ADD COLUMN "thumbKey" TEXT;
