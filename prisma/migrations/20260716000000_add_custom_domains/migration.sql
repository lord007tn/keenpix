CREATE TABLE "CustomDomain" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "providerHostnameId" TEXT NOT NULL,
    "providerData" JSONB,
    "dnsStatus" TEXT NOT NULL DEFAULT 'pending',
    "sslStatus" TEXT NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomDomain_hostname_key" ON "CustomDomain"("hostname");
CREATE UNIQUE INDEX "CustomDomain_providerHostnameId_key" ON "CustomDomain"("providerHostnameId");
CREATE INDEX "CustomDomain_projectId_idx" ON "CustomDomain"("projectId");
CREATE INDEX "CustomDomain_hostname_dnsStatus_sslStatus_idx" ON "CustomDomain"("hostname", "dnsStatus", "sslStatus");

ALTER TABLE "CustomDomain"
ADD CONSTRAINT "CustomDomain_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
