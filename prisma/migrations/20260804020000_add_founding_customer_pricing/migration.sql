ALTER TABLE "Subscription"
ADD COLUMN "overagePerGbCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "becamePayingAt" TIMESTAMP(3);

UPDATE "Subscription"
SET
  "overagePerGbCents" = CASE "plan"
    WHEN 'basic' THEN 8
    WHEN 'pro' THEN 6
    WHEN 'business' THEN 5
    ELSE 0
  END,
  "becamePayingAt" = CASE
    WHEN "polarSubscriptionId" IS NOT NULL AND "status" = 'active'
      THEN COALESCE("currentPeriodStart", "updatedAt")
    ELSE NULL
  END;

CREATE INDEX "Subscription_becamePayingAt_idx"
ON "Subscription"("becamePayingAt");
