-- CreateTable
CREATE TABLE "InternalPlanGrant" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "reason" TEXT,
    "grantedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalPlanGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternalPlanGrant_orgId_key" ON "InternalPlanGrant"("orgId");

-- CreateIndex
CREATE INDEX "InternalPlanGrant_expiresAt_idx" ON "InternalPlanGrant"("expiresAt");

-- AddForeignKey
ALTER TABLE "InternalPlanGrant" ADD CONSTRAINT "InternalPlanGrant_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
