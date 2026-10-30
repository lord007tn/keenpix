CREATE TABLE "ProjectFirstExternalImage" (
  "projectId" TEXT NOT NULL PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "definitionVersion" INTEGER NOT NULL DEFAULT 1 CHECK ("definitionVersion" = 1),
  CONSTRAINT "ProjectFirstExternalImage_projectId_orgId_fkey" FOREIGN KEY ("projectId", "orgId") REFERENCES "Project"("id", "orgId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProjectFirstExternalImage_observedAt_idx" ON "ProjectFirstExternalImage"("observedAt");
CREATE INDEX "ProjectFirstExternalImage_orgId_idx" ON "ProjectFirstExternalImage"("orgId");

CREATE TABLE "FirstExternalImageCoverage" (
  "definitionVersion" INTEGER NOT NULL PRIMARY KEY CHECK ("definitionVersion" = 1),
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Positive coverage evidence only. An unverified interval remains Unknown even
-- if a dead process could not persist its interruption during a database outage.
CREATE TABLE "FirstExternalImageVerifiedInterval" (
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("startedAt", "endedAt"),
  CHECK ("endedAt" > "startedAt")
);
CREATE TABLE "FirstExternalImageInterruption" (
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("startedAt", "endedAt"),
  CHECK ("endedAt" > "startedAt")
);
CREATE TABLE "ImageMeasurementOutbox" (
  "id" TEXT PRIMARY KEY,
  "candidates" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ImageMeasurementOutbox_nextAttemptAt_createdAt_idx" ON "ImageMeasurementOutbox"("nextAttemptAt", "createdAt");
