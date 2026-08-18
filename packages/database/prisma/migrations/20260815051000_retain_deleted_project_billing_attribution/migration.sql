CREATE TABLE "ProjectBillingAttribution" (
    "projectId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectBillingAttribution_pkey" PRIMARY KEY ("projectId")
);

CREATE INDEX "ProjectBillingAttribution_orgId_idx" ON "ProjectBillingAttribution"("orgId");

ALTER TABLE "ProjectEdgeRollupHourly"
DROP CONSTRAINT IF EXISTS "ProjectEdgeRollupHourly_projectId_fkey";
