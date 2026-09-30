ALTER TABLE "AnalyticsEventOutbox" ADD COLUMN "activationCandidate" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "OrganizationActivationPolicy" (
  "orgId" TEXT NOT NULL PRIMARY KEY,
  "classification" TEXT NOT NULL CHECK ("classification" IN ('customer', 'internal', 'test', 'unclassified')),
  "eligibleSince" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationActivationPolicy_customer_coverage_check" CHECK ("classification" <> 'customer' OR "eligibleSince" IS NOT NULL),
  CONSTRAINT "OrganizationActivationPolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProjectFirstImageSuccess" (
  "projectId" TEXT NOT NULL PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "definitionVersion" INTEGER NOT NULL DEFAULT 1 CHECK ("definitionVersion" = 1),
  CONSTRAINT "ProjectFirstImageSuccess_projectId_orgId_fkey" FOREIGN KEY ("projectId", "orgId") REFERENCES "Project"("id", "orgId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProjectFirstImageSuccess_observedAt_idx" ON "ProjectFirstImageSuccess"("observedAt");
CREATE INDEX "ProjectFirstImageSuccess_orgId_idx" ON "ProjectFirstImageSuccess"("orgId");
CREATE UNIQUE INDEX "ProjectFirstImageSuccess_projectId_orgId_key" ON "ProjectFirstImageSuccess"("projectId", "orgId");
