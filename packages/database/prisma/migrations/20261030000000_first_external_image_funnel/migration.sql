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
