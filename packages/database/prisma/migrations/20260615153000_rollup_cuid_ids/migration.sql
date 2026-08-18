-- Switch our own rollup tables (Resource, Analytics) from deterministic string
-- ids to cuid surrogate keys. Dedup for the hourly upserts now relies on a
-- unique constraint over each table's natural key instead of the old md5(id).
-- (EdgeRollupHourly is Cloudflare integration data and keeps its existing id.)

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsRollupHourly_bucketStart_orgId_projectId_sourceHos_key" ON "AnalyticsRollupHourly"("bucketStart", "orgId", "projectId", "sourceHost", "country", "path", "format", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceRollupHourly_bucketStart_key" ON "ResourceRollupHourly"("bucketStart");
