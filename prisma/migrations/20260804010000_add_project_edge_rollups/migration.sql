ALTER TABLE "CloudflareSettings" ADD COLUMN "accountId" TEXT;

CREATE TABLE "ProjectEdgeRollupHourly" (
    "id" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "host" TEXT NOT NULL DEFAULT '',
    "stage" TEXT NOT NULL,
    "cacheStatus" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "bytes" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectEdgeRollupHourly_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectEdgeCaptureState" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "status" TEXT NOT NULL,
    "groups" INTEGER NOT NULL DEFAULT 0,
    "coveredFrom" TIMESTAMP(3),
    "coveredUntil" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3) NOT NULL,
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectEdgeCaptureState_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectEdgeRollupHourly_bucketStart_idx" ON "ProjectEdgeRollupHourly"("bucketStart");
CREATE INDEX "ProjectEdgeRollupHourly_orgId_bucketStart_idx" ON "ProjectEdgeRollupHourly"("orgId", "bucketStart");
CREATE INDEX "ProjectEdgeRollupHourly_projectId_bucketStart_idx" ON "ProjectEdgeRollupHourly"("projectId", "bucketStart");
CREATE INDEX "ProjectEdgeRollupHourly_orgId_projectId_bucketStart_idx" ON "ProjectEdgeRollupHourly"("orgId", "projectId", "bucketStart");

ALTER TABLE "ProjectEdgeRollupHourly"
ADD CONSTRAINT "ProjectEdgeRollupHourly_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
