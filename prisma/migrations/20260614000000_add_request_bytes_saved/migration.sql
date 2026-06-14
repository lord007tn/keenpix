-- Per-request optimizer savings. "Bandwidth saved" was derived as
-- (bytesIn - bytesOut), but cache hits log bytesIn = 0 while still delivering
-- bytesOut, so at high cache-hit rates the figure trended to zero/negative.
-- bytesSaved records the real compression delta per request instead, summed
-- into the rollups, so the KPI stays a true, always-positive savings number.

-- RequestLog: add the column and backfill from existing rows.
ALTER TABLE "RequestLog" ADD COLUMN "bytesSaved" INTEGER NOT NULL DEFAULT 0;
UPDATE "RequestLog" SET "bytesSaved" = GREATEST(0, "bytesIn" - "bytesOut");

-- AnalyticsRollupHourly: add the column and backfill by re-aggregating the raw
-- logs into the same hourly buckets the rollups already use.
ALTER TABLE "AnalyticsRollupHourly" ADD COLUMN "bytesSaved" BIGINT NOT NULL DEFAULT 0;
UPDATE "AnalyticsRollupHourly" r
SET "bytesSaved" = sub.saved
FROM (
    SELECT
        md5(concat_ws('|',
            date_trunc('hour', "ts")::text,
            "orgId",
            "projectId",
            coalesce("sourceHost", ''),
            "path",
            "format",
            "status"::text
        )) AS id,
        coalesce(sum(GREATEST(0, "bytesIn" - "bytesOut")), 0)::bigint AS saved
    FROM "RequestLog"
    GROUP BY
        date_trunc('hour', "ts"),
        "orgId",
        "projectId",
        coalesce("sourceHost", ''),
        "path",
        "format",
        "status"
) sub
WHERE r."id" = sub.id;
