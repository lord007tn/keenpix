-- BillingCustomer.polarCustomerId is no longer unique: one Polar customer maps
-- 1:1 to a user, and a user can own several orgs, so the same customer id
-- legitimately backs multiple orgs' billing records. Swap the unique index for a
-- plain index (orgId remains the unique key — one billing row per org).
DROP INDEX IF EXISTS "BillingCustomer_polarCustomerId_key";

CREATE INDEX IF NOT EXISTS "BillingCustomer_polarCustomerId_idx" ON "BillingCustomer"("polarCustomerId");
