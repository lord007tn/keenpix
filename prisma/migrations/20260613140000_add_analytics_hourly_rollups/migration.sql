-- CreateTable
CREATE TABLE "AnalyticsRollupHourly" (
    "id" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceHost" TEXT NOT NULL DEFAULT '',
    "path" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "cachedRequests" INTEGER NOT NULL DEFAULT 0,
    "optimizedRequests" INTEGER NOT NULL DEFAULT 0,
    "bytesIn" BIGINT NOT NULL DEFAULT 0,
    "bytesOut" BIGINT NOT NULL DEFAULT 0,
    "latencyMsSum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyLe5" INTEGER NOT NULL DEFAULT 0,
    "latencyLe10" INTEGER NOT NULL DEFAULT 0,
    "latencyLe20" INTEGER NOT NULL DEFAULT 0,
    "latencyLe35" INTEGER NOT NULL DEFAULT 0,
    "latencyLe55" INTEGER NOT NULL DEFAULT 0,
    "latencyLe80" INTEGER NOT NULL DEFAULT 0,
    "latencyLe120" INTEGER NOT NULL DEFAULT 0,
    "latencyLe180" INTEGER NOT NULL DEFAULT 0,
    "latencyLe260" INTEGER NOT NULL DEFAULT 0,
    "latencyLe380" INTEGER NOT NULL DEFAULT 0,
    "latencyLe540" INTEGER NOT NULL DEFAULT 0,
    "latencyLe800" INTEGER NOT NULL DEFAULT 0,
    "latencyLe1100" INTEGER NOT NULL DEFAULT 0,
    "latencyGt1100" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsRollupHourly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsRollupHourly_bucketStart_idx" ON "AnalyticsRollupHourly"("bucketStart");

-- CreateIndex
CREATE INDEX "AnalyticsRollupHourly_orgId_bucketStart_idx" ON "AnalyticsRollupHourly"("orgId", "bucketStart");

-- CreateIndex
CREATE INDEX "AnalyticsRollupHourly_projectId_bucketStart_idx" ON "AnalyticsRollupHourly"("projectId", "bucketStart");

-- CreateIndex
CREATE INDEX "AnalyticsRollupHourly_projectId_sourceHost_bucketStart_idx" ON "AnalyticsRollupHourly"("projectId", "sourceHost", "bucketStart");

-- CreateIndex
CREATE INDEX "AnalyticsRollupHourly_format_bucketStart_idx" ON "AnalyticsRollupHourly"("format", "bucketStart");

-- CreateIndex
CREATE INDEX "AnalyticsRollupHourly_status_bucketStart_idx" ON "AnalyticsRollupHourly"("status", "bucketStart");

-- Backfill existing request logs into hourly rollups so analytics stay populated
-- immediately after deploy. New rows are maintained incrementally by the app.
INSERT INTO "AnalyticsRollupHourly" (
    "id",
    "bucketStart",
    "orgId",
    "projectId",
    "sourceHost",
    "path",
    "format",
    "status",
    "requests",
    "cachedRequests",
    "optimizedRequests",
    "bytesIn",
    "bytesOut",
    "latencyMsSum",
    "latencyLe5",
    "latencyLe10",
    "latencyLe20",
    "latencyLe35",
    "latencyLe55",
    "latencyLe80",
    "latencyLe120",
    "latencyLe180",
    "latencyLe260",
    "latencyLe380",
    "latencyLe540",
    "latencyLe800",
    "latencyLe1100",
    "latencyGt1100",
    "updatedAt"
)
SELECT
    md5(concat_ws('|',
        date_trunc('hour', "ts")::text,
        "orgId",
        "projectId",
        coalesce("sourceHost", ''),
        "path",
        "format",
        "status"::text
    )),
    date_trunc('hour', "ts"),
    "orgId",
    "projectId",
    coalesce("sourceHost", ''),
    "path",
    "format",
    "status",
    count(*)::integer,
    count(*) FILTER (WHERE "cached")::integer,
    count(*) FILTER (WHERE NOT "cached")::integer,
    coalesce(sum("bytesIn"), 0)::bigint,
    coalesce(sum("bytesOut"), 0)::bigint,
    coalesce(sum("latencyMs"), 0)::double precision,
    count(*) FILTER (WHERE "latencyMs" <= 5)::integer,
    count(*) FILTER (WHERE "latencyMs" > 5 AND "latencyMs" <= 10)::integer,
    count(*) FILTER (WHERE "latencyMs" > 10 AND "latencyMs" <= 20)::integer,
    count(*) FILTER (WHERE "latencyMs" > 20 AND "latencyMs" <= 35)::integer,
    count(*) FILTER (WHERE "latencyMs" > 35 AND "latencyMs" <= 55)::integer,
    count(*) FILTER (WHERE "latencyMs" > 55 AND "latencyMs" <= 80)::integer,
    count(*) FILTER (WHERE "latencyMs" > 80 AND "latencyMs" <= 120)::integer,
    count(*) FILTER (WHERE "latencyMs" > 120 AND "latencyMs" <= 180)::integer,
    count(*) FILTER (WHERE "latencyMs" > 180 AND "latencyMs" <= 260)::integer,
    count(*) FILTER (WHERE "latencyMs" > 260 AND "latencyMs" <= 380)::integer,
    count(*) FILTER (WHERE "latencyMs" > 380 AND "latencyMs" <= 540)::integer,
    count(*) FILTER (WHERE "latencyMs" > 540 AND "latencyMs" <= 800)::integer,
    count(*) FILTER (WHERE "latencyMs" > 800 AND "latencyMs" <= 1100)::integer,
    count(*) FILTER (WHERE "latencyMs" > 1100)::integer,
    CURRENT_TIMESTAMP
FROM "RequestLog"
GROUP BY
    date_trunc('hour', "ts"),
    "orgId",
    "projectId",
    coalesce("sourceHost", ''),
    "path",
    "format",
    "status";
