-- Provider-managed and complimentary access share the local subscription
-- snapshot. Provider linkage, rather than a second entitlement flag, is the
-- source-of-truth discriminator.
ALTER TABLE "Subscription"
  ALTER COLUMN "polarSubscriptionId" DROP NOT NULL,
  ADD COLUMN "amountCents" INTEGER NOT NULL DEFAULT 0;

-- Existing paid monthly snapshots receive their catalog MRR. Complimentary
-- access remains zero and reporting filters on provider linkage as well.
UPDATE "Subscription"
SET "amountCents" = CASE "plan"
  WHEN 'basic' THEN 900
  WHEN 'pro' THEN 1900
  WHEN 'business' THEN 3900
  ELSE 0
END
WHERE "polarSubscriptionId" IS NOT NULL;

CREATE TABLE "SubscriptionGrantAudit" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "previousPlan" TEXT,
  "plan" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionGrantAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubscriptionGrantAudit_orgId_createdAt_idx"
  ON "SubscriptionGrantAudit"("orgId", "createdAt");

ALTER TABLE "SubscriptionGrantAudit"
  ADD CONSTRAINT "SubscriptionGrantAudit_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve each old grant in the audit ledger. If Polar already owns the org's
-- subscription row, the paid row wins and the migration records that outcome.
INSERT INTO "SubscriptionGrantAudit" (
  "id", "orgId", "actorId", "action", "previousPlan", "plan", "createdAt"
)
SELECT
  'grant_migration_' || md5(legacy_grant."orgId"),
  legacy_grant."orgId",
  legacy_grant."grantedById",
  CASE WHEN subscription."orgId" IS NULL
    THEN 'migrated'
    ELSE 'skipped_provider_managed'
  END,
  NULL,
  legacy_grant."plan",
  legacy_grant."updatedAt"
FROM "InternalPlanGrant" AS legacy_grant
LEFT JOIN "Subscription" AS subscription
  ON subscription."orgId" = legacy_grant."orgId";

-- Only grants without an existing provider-managed row become complimentary
-- subscriptions. Expired grants are retained in the audit ledger but do not
-- create active entitlement.
INSERT INTO "Subscription" (
  "id", "orgId", "polarSubscriptionId", "plan", "status", "amountCents",
  "overageAllowed", "cancelAtPeriodEnd", "createdAt", "updatedAt"
)
SELECT
  'complimentary_' || md5(legacy_grant."orgId"),
  legacy_grant."orgId",
  NULL,
  legacy_grant."plan",
  'active',
  0,
  FALSE,
  FALSE,
  legacy_grant."createdAt",
  legacy_grant."updatedAt"
FROM "InternalPlanGrant" AS legacy_grant
WHERE (
  legacy_grant."expiresAt" IS NULL
  OR legacy_grant."expiresAt" > CURRENT_TIMESTAMP
)
  AND NOT EXISTS (
    SELECT 1 FROM "Subscription" AS subscription
    WHERE subscription."orgId" = legacy_grant."orgId"
  );

DROP TABLE "InternalPlanGrant";
