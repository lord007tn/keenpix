-- AlterTable
ALTER TABLE "AnalyticsRollupHourly" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "EdgeRollupHourly" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "host" TEXT NOT NULL DEFAULT '',
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "cacheStatus" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "bytes" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EdgeRollupHourly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EdgeRollupHourly_zoneId_host_bucketStart_idx" ON "EdgeRollupHourly"("zoneId", "host", "bucketStart");
