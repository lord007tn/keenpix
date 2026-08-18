CREATE TABLE "EdgeCaptureState" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "host" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL,
    "groups" INTEGER NOT NULL DEFAULT 0,
    "coveredFrom" TIMESTAMP(3),
    "coveredUntil" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3) NOT NULL,
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EdgeCaptureState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EdgeCaptureState_zoneId_host_key"
ON "EdgeCaptureState"("zoneId", "host");

CREATE INDEX "EdgeCaptureState_lastSuccessAt_idx"
ON "EdgeCaptureState"("lastSuccessAt");
