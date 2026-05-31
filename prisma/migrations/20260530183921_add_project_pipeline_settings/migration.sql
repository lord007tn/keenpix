-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "autoFormat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "defaultQuality" INTEGER NOT NULL DEFAULT 75,
ADD COLUMN     "stripMetadata" BOOLEAN NOT NULL DEFAULT true;
