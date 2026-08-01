-- Only successful image deliveries can be cache hits or live optimizations.
-- Older rollups counted every non-cache response, including 4xx/5xx failures,
-- as an optimization. Rows are already split by status, so correction is exact.
UPDATE "AnalyticsRollupHourly"
SET
  "cachedRequests" = 0,
  "optimizedRequests" = 0,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" < 200 OR "status" >= 300;
