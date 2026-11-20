-- Additive only: no existing table is copied, dropped or rewritten, so no data can be lost.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletionScheduledAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "warningDeadlineAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "warningRespondedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "warningResponse" TEXT;

-- CreateTable
CREATE TABLE "OneTimeCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OneTimeCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeletedAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailHash" TEXT NOT NULL,
    "reason" TEXT,
    "deletedBy" TEXT NOT NULL,
    "deletedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "OneTimeCode_userId_purpose_createdAt_idx" ON "OneTimeCode"("userId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "DeletedAccount_emailHash_idx" ON "DeletedAccount"("emailHash");

-- Accounts created before email verification existed are treated as verified (no OTP for existing users).
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;
