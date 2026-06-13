-- Instance-wide Cloudflare edge-analytics configuration (single row; null fields
-- fall back to the CLOUDFLARE_* environment defaults). The API token is stored
-- AES-256-GCM encrypted by the app. Mirrors SmtpSettings / OperationsSettings.
CREATE TABLE "CloudflareSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "apiToken" TEXT,
    "zoneId" TEXT,
    "host" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudflareSettings_pkey" PRIMARY KEY ("id")
);
