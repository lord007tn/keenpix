CREATE TABLE "ApiKeyActivity" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "projectId" TEXT,
    "scope" TEXT NOT NULL,
    "latencyMs" DOUBLE PRECISION,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKeyActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiKeyActivity_apiKeyId_createdAt_idx" ON "ApiKeyActivity"("apiKeyId", "createdAt");
CREATE INDEX "ApiKeyActivity_createdAt_idx" ON "ApiKeyActivity"("createdAt");

ALTER TABLE "ApiKeyActivity" ADD CONSTRAINT "ApiKeyActivity_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "apikey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
