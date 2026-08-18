-- Drop the unused per-project environment label.
ALTER TABLE "Project" DROP COLUMN "env";

-- Per-project pipeline policy: optional max-width cap + default fit/DPR.
ALTER TABLE "Project" ADD COLUMN "maxWidth" INTEGER;
ALTER TABLE "Project" ADD COLUMN "defaultFit" TEXT NOT NULL DEFAULT 'cover';
ALTER TABLE "Project" ADD COLUMN "defaultDpr" INTEGER NOT NULL DEFAULT 1;

-- Instance-wide operations configuration (single row; null = use env default).
CREATE TABLE "OperationsSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "diskCacheMaxMb" INTEGER,
    "memoryCacheMaxMb" INTEGER,
    "transformConcurrency" INTEGER,
    "maxQueueDepth" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationsSettings_pkey" PRIMARY KEY ("id")
);
