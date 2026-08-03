CREATE TABLE "FinanceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "serverMonthlyCents" INTEGER NOT NULL DEFAULT 0,
    "databaseMonthlyCents" INTEGER NOT NULL DEFAULT 0,
    "observabilityMonthlyCents" INTEGER NOT NULL DEFAULT 0,
    "otherMonthlyCents" INTEGER NOT NULL DEFAULT 0,
    "originRequestsMicrodollarsPerMillion" INTEGER NOT NULL DEFAULT 0,
    "originBandwidthMicrodollarsPerGb" INTEGER NOT NULL DEFAULT 0,
    "edgeRequestsMicrodollarsPerMillion" INTEGER NOT NULL DEFAULT 0,
    "edgeBandwidthMicrodollarsPerGb" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceSettings_pkey" PRIMARY KEY ("id")
);
