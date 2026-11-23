-- Additive only: one new table, nothing existing is changed.

-- CreateTable
CREATE TABLE "HealthCondition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "diagnosedOn" DATETIME,
    "resolvedOn" DATETIME,
    "doctorName" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HealthCondition_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HealthCondition_profileId_idx" ON "HealthCondition"("profileId");
