-- Add a country dimension to the hourly rollups for geographic distribution.
-- country becomes part of the rollup grouping key (and therefore the row id),
-- so the existing rows — keyed without it — must be rebuilt. Rollups are derived
-- data, so we rebuild them from the raw request logs (the same backfill the
-- rollup table shipped with), now grouping by country too. Historical logs have
-- no country captured yet, so they aggregate under '' (shown as "Unknown").

ALTER TABLE "AnalyticsRollupHourly" ADD COLUMN "country" TEXT NOT NULL DEFAULT '';

TRUNCATE TABLE "AnalyticsRollupHourly";

INSERT INTO "AnalyticsRollupHourly" (
    "id",
    "bucketStart",
    "orgId",
    "projectId",
    "sourceHost",
    "country",
    "path",
    "format",
    "status",
    "requests",
    "cachedRequests",
    "optimizedRequests",
    "bytesIn",
    "bytesOut",
    "bytesSaved",
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
        coalesce("country", ''),
        "path",
        "format",
        "status"::text
    )),
    date_trunc('hour', "ts"),
    "orgId",
    "projectId",
    coalesce("sourceHost", ''),
    coalesce("country", ''),
    "path",
    "format",
    "status",
    count(*)::integer,
    count(*) FILTER (WHERE "cached")::integer,
    count(*) FILTER (WHERE NOT "cached")::integer,
    coalesce(sum("bytesIn"), 0)::bigint,
    coalesce(sum("bytesOut"), 0)::bigint,
    coalesce(sum(GREATEST(0, "bytesSaved")), 0)::bigint,
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
    coalesce("country", ''),
    "path",
    "format",
    "status";
