-- A production restore reintroduced legacy non-delivery classifications after
-- the original correction migration had already run. Reapply the invariant:
-- only successful 2xx responses can be cache-optimized or newly optimized.
UPDATE "AnalyticsRollupHourly"
SET
  "cachedRequests" = 0,
  "optimizedRequests" = 0,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  ("status" < 200 OR "status" >= 300)
  AND ("cachedRequests" <> 0 OR "optimizedRequests" <> 0);
