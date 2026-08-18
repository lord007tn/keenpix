CREATE TABLE "AnalyticsEventOutbox" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "path" TEXT NOT NULL,
    "width" INTEGER,
    "quality" INTEGER,
    "format" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "cached" BOOLEAN NOT NULL,
    "latencyMs" DOUBLE PRECISION NOT NULL,
    "bytesIn" INTEGER NOT NULL,
    "bytesOut" INTEGER NOT NULL,
    "bytesSaved" INTEGER NOT NULL DEFAULT 0,
    "region" TEXT,
    "country" TEXT,
    "sourceHost" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEventOutbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsEventOutbox_createdAt_idx" ON "AnalyticsEventOutbox"("createdAt");
CREATE INDEX "AnalyticsEventOutbox_orgId_ts_idx" ON "AnalyticsEventOutbox"("orgId", "ts");

ALTER TABLE "AnalyticsEventOutbox" ADD CONSTRAINT "AnalyticsEventOutbox_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
