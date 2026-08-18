-- Multi-tenant organization model (better-auth `organization` plugin).
--
-- The existing single-org `Org` table is RENAMED into `Organization` rather than
-- dropped + recreated, so its rows and the `Project.orgId` foreign key survive
-- (in Postgres a FK follows a table rename automatically). Prisma would emit a
-- destructive DROP/CREATE here; this hand-written migration preserves data.

-- Rename the table and its primary-key constraint to the new name.
ALTER TABLE "Org" RENAME TO "Organization";
ALTER TABLE "Organization" RENAME CONSTRAINT "Org_pkey" TO "Organization_pkey";

-- Columns required by the better-auth organization plugin.
ALTER TABLE "Organization" ADD COLUMN "slug" TEXT;
ALTER TABLE "Organization" ADD COLUMN "logo" TEXT;
ALTER TABLE "Organization" ADD COLUMN "metadata" TEXT;

-- Backfill the required unique slug for any pre-existing org, then enforce it.
UPDATE "Organization" SET "slug" = 'default' WHERE "id" = 'org_default' AND "slug" IS NULL;
UPDATE "Organization" SET "slug" = "id" WHERE "slug" IS NULL;
ALTER TABLE "Organization" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- Session gains the active-org pointer the plugin reads on every request.
ALTER TABLE "Session" ADD COLUMN "activeOrganizationId" TEXT;

-- Membership + invitation tables (shapes taken verbatim from `prisma migrate diff`).
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "teamId" TEXT,
    "inviterId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Member_organizationId_idx" ON "Member"("organizationId");
CREATE UNIQUE INDEX "Member_userId_organizationId_key" ON "Member"("userId", "organizationId");
CREATE INDEX "Invitation_organizationId_idx" ON "Invitation"("organizationId");
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill membership for existing users so a self-host upgrade keeps working:
-- the seeded super_admin becomes the org owner, everyone else a member. No-op on
-- a fresh database (no users yet); the seed script handles first-run membership.
INSERT INTO "Member" ("id", "organizationId", "userId", "role", "createdAt")
SELECT gen_random_uuid()::text, 'org_default', u."id",
    CASE WHEN u."role" = 'super_admin' THEN 'owner' ELSE 'member' END,
    CURRENT_TIMESTAMP
FROM "User" u
WHERE EXISTS (SELECT 1 FROM "Organization" WHERE "id" = 'org_default')
ON CONFLICT ("userId", "organizationId") DO NOTHING;

-- Point existing sessions at the default org so they resolve after upgrade.
UPDATE "Session" SET "activeOrganizationId" = 'org_default'
WHERE "activeOrganizationId" IS NULL
  AND EXISTS (SELECT 1 FROM "Organization" WHERE "id" = 'org_default');
