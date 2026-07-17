CREATE TABLE "SubscriptionAddon" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "polarSubscriptionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "polarModifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionAddon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionAddon_polarSubscriptionId_key"
ON "SubscriptionAddon"("polarSubscriptionId");

CREATE UNIQUE INDEX "SubscriptionAddon_orgId_kind_key"
ON "SubscriptionAddon"("orgId", "kind");

CREATE INDEX "SubscriptionAddon_orgId_status_idx"
ON "SubscriptionAddon"("orgId", "status");

ALTER TABLE "SubscriptionAddon"
ADD CONSTRAINT "SubscriptionAddon_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
