-- AlterTable
ALTER TABLE "Project" ADD COLUMN "requireSignedUrls" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "signingSecret" TEXT;
