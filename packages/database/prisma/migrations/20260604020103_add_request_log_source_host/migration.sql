-- AlterTable
ALTER TABLE "RequestLog" ADD COLUMN     "sourceHost" TEXT;

-- CreateIndex
CREATE INDEX "RequestLog_projectId_sourceHost_idx" ON "RequestLog"("projectId", "sourceHost");
