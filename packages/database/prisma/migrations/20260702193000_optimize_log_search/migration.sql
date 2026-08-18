CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "RequestLog_ts_idx" ON "RequestLog"("ts");
CREATE INDEX "RequestLog_path_trgm_idx" ON "RequestLog" USING GIN ("path" gin_trgm_ops);
CREATE INDEX "RequestLog_sourceHost_trgm_idx" ON "RequestLog" USING GIN ("sourceHost" gin_trgm_ops);
