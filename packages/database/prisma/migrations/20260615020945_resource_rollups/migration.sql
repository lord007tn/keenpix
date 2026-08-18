-- CreateTable
CREATE TABLE "ResourceRollupHourly" (
    "id" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "cpuAvgPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpuPeakPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpuCores" DOUBLE PRECISION,
    "memAvgBytes" BIGINT NOT NULL DEFAULT 0,
    "memPeakBytes" BIGINT NOT NULL DEFAULT 0,
    "memLimitBytes" BIGINT NOT NULL DEFAULT 0,
    "samples" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceRollupHourly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceRollupHourly_bucketStart_idx" ON "ResourceRollupHourly"("bucketStart");
