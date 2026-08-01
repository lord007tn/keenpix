-- First-class organization/project ownership for SDK API keys. The composite
-- project foreign key guarantees that a scoped key cannot point across tenants.
CREATE UNIQUE INDEX "Project_id_orgId_key" ON "Project"("id", "orgId");

CREATE TABLE "ApiKeyScope" (
    "apiKeyId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKeyScope_pkey" PRIMARY KEY ("apiKeyId")
);

CREATE INDEX "ApiKeyScope_orgId_idx" ON "ApiKeyScope"("orgId");
CREATE INDEX "ApiKeyScope_projectId_orgId_idx" ON "ApiKeyScope"("projectId", "orgId");

ALTER TABLE "ApiKeyScope" ADD CONSTRAINT "ApiKeyScope_apiKeyId_fkey"
FOREIGN KEY ("apiKeyId") REFERENCES "apikey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApiKeyScope" ADD CONSTRAINT "ApiKeyScope_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApiKeyScope" ADD CONSTRAINT "ApiKeyScope_projectId_orgId_fkey"
FOREIGN KEY ("projectId", "orgId") REFERENCES "Project"("id", "orgId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill keys created by v0.2.0's metadata-based implementation. Invalid,
-- unknown-org, or cross-org metadata deliberately remains unscoped and will be
-- rejected by the cloud verifier instead of being widened to all projects.
DO $$
DECLARE
  key_row RECORD;
  parsed JSONB;
  parsed_text TEXT;
  scope_org_id TEXT;
  scope_project_id TEXT;
BEGIN
  FOR key_row IN
    SELECT "id", "metadata"
    FROM "apikey"
    WHERE "configId" = 'internal' AND "metadata" IS NOT NULL
  LOOP
    BEGIN
      parsed := key_row."metadata"::jsonb;
      IF jsonb_typeof(parsed) = 'string' THEN
        parsed_text := parsed #>> '{}';
        parsed := parsed_text::jsonb;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;

    IF jsonb_typeof(parsed) <> 'object' THEN
      CONTINUE;
    END IF;

    scope_org_id := NULLIF(BTRIM(parsed ->> 'orgId'), '');
    scope_project_id := NULLIF(BTRIM(parsed ->> 'projectId'), '');
    IF scope_org_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM "Organization" WHERE "id" = scope_org_id
    ) THEN
      CONTINUE;
    END IF;
    IF scope_project_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "Project"
      WHERE "id" = scope_project_id AND "orgId" = scope_org_id
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO "ApiKeyScope" ("apiKeyId", "orgId", "projectId")
    VALUES (key_row."id", scope_org_id, scope_project_id)
    ON CONFLICT ("apiKeyId") DO NOTHING;
  END LOOP;
END $$;

-- Better Auth now treats the organization as the owning reference as well.
-- Keep its built-in list/update/delete authorization aligned with ApiKeyScope.
UPDATE "apikey" AS api_key
SET "referenceId" = scope."orgId"
FROM "ApiKeyScope" AS scope
WHERE api_key."id" = scope."apiKeyId";
