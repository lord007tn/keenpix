-- The default operator workspace is an internal Keenpix account, not a Polar
-- customer. Give it the highest current internal plan when no operator grant
-- exists. Existing grants remain authoritative and are never overwritten.
INSERT INTO "InternalPlanGrant" (
  "id",
  "orgId",
  "plan",
  "reason",
  "grantedById",
  "createdAt",
  "updatedAt"
)
SELECT
  'internal_default_operator',
  organization."id",
  'business',
  'Default operator internal entitlement',
  operator."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" AS organization
LEFT JOIN LATERAL (
  SELECT "id"
  FROM "User"
  WHERE "role" = 'super_admin'
  ORDER BY "createdAt" ASC
  LIMIT 1
) AS operator ON TRUE
WHERE organization."id" = 'org_default'
  AND NOT EXISTS (
    SELECT 1
    FROM "InternalPlanGrant" AS existing
    WHERE existing."orgId" = organization."id"
  );
