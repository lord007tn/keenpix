import type { Prisma } from '../generated/prisma/client'
import { prisma } from '../index'

// Operator-only classification. No public or tenant endpoint exposes this write.
// Enrollment starts at database time; reclassification never backdates coverage.
export function setOrganizationActivationClassification(input: {
  orgId: string
  classification: 'customer' | 'internal' | 'test' | 'unclassified'
}) {
  return prisma.$executeRaw`
    INSERT INTO "OrganizationActivationPolicy" ("orgId", "classification", "eligibleSince", "updatedAt")
    SELECT o."id", ${input.classification},
      CASE WHEN ${input.classification} = 'customer' THEN CURRENT_TIMESTAMP ELSE NULL END,
      CURRENT_TIMESTAMP
    FROM "Organization" o WHERE o."id" = ${input.orgId}
    ON CONFLICT ("orgId") DO UPDATE SET
      "classification" = EXCLUDED."classification",
      "eligibleSince" = CASE
        WHEN EXCLUDED."classification" <> 'customer' THEN NULL
        WHEN "OrganizationActivationPolicy"."classification" = 'customer' THEN "OrganizationActivationPolicy"."eligibleSince"
        ELSE EXCLUDED."eligibleSince" END,
      "updatedAt" = CURRENT_TIMESTAMP
  `
}

// A composite FK and project lookup bind this outcome to its owning tenant.
// The unique project key is the idempotency boundary across retries/replicas.
// Keep the earliest qualified event time even when durable outbox batches arrive
// out of order. This is an origin observation, not image receipt by a visitor.
export function recordProjectFirstImageSuccess(
  input: {
    projectId: string
    orgId: string
    observedAt?: Date
  },
  db: Pick<Prisma.TransactionClient, '$executeRaw'> = prisma,
) {
  return db.$executeRaw`
    INSERT INTO "ProjectFirstImageSuccess" ("projectId", "orgId", "observedAt", "definitionVersion")
    SELECT p."id", p."orgId", COALESCE(${input.observedAt ?? null}::timestamp, CURRENT_TIMESTAMP), 1
    FROM "Project" p
    JOIN "OrganizationActivationPolicy" policy ON policy."orgId" = p."orgId"
    WHERE p."id" = ${input.projectId} AND p."orgId" = ${input.orgId}
      AND policy."classification" = 'customer' AND policy."eligibleSince" IS NOT NULL
      AND policy."eligibleSince" <= COALESCE(${input.observedAt ?? null}::timestamp, CURRENT_TIMESTAMP)
      AND EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
        WHERE m."organizationId" = p."orgId" AND m."role" = 'owner' AND u."role" = 'user')
      AND NOT EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
        WHERE m."organizationId" = p."orgId" AND u."role" <> 'user')
    ON CONFLICT ("projectId") DO UPDATE SET "observedAt" = EXCLUDED."observedAt"
      WHERE EXCLUDED."observedAt" < "ProjectFirstImageSuccess"."observedAt"
  `
}

// Restricted operator aggregate: never return org/project/user identifiers,
// image URLs, cookies, Google identifiers, or per-customer rows.
export async function getFirstImageActivationReadout(input: {
  from: Date
  to: Date
}) {
  const rows = await prisma.$queryRaw<
    {
      retainedProjects: number
      unclassifiedProjects: number
      excludedProjects: number
      classifiedCustomerProjects: number
      prospectiveProjects: number
      prospectiveProjectsCreatedInWindow: number
      prospectiveFirstSuccessesInWindow: number
      legacyFirstObservationsInWindow: number
      prospectiveProjectsWithoutObservation: number
      pendingCandidateEvents: number
    }[]
  >`
    WITH projects AS (
      SELECT p."id", p."createdAt", policy."classification", policy."eligibleSince", s."observedAt",
        EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
          WHERE m."organizationId" = p."orgId" AND m."role" = 'owner' AND u."role" = 'user')
        AND NOT EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
          WHERE m."organizationId" = p."orgId" AND u."role" <> 'user') AS "ordinaryOwnership"
      FROM "Project" p
      LEFT JOIN "OrganizationActivationPolicy" policy ON policy."orgId" = p."orgId"
      LEFT JOIN "ProjectFirstImageSuccess" s ON s."projectId" = p."id" AND s."orgId" = p."orgId"
      WHERE p."createdAt" < ${input.to}
    ), classified AS (
      SELECT *, "classification" = 'customer' AND "eligibleSince" IS NOT NULL AND "ordinaryOwnership" AS eligible
      FROM projects
    )
    SELECT COUNT(*)::int AS "retainedProjects",
      COUNT(*) FILTER (WHERE "classification" IS NULL OR "classification" = 'unclassified')::int AS "unclassifiedProjects",
      COUNT(*) FILTER (WHERE "classification" IN ('internal', 'test') OR
        ("classification" = 'customer' AND NOT "ordinaryOwnership"))::int AS "excludedProjects",
      COUNT(*) FILTER (WHERE eligible)::int AS "classifiedCustomerProjects",
      COUNT(*) FILTER (WHERE eligible AND "createdAt" >= "eligibleSince")::int AS "prospectiveProjects",
      COUNT(*) FILTER (WHERE eligible AND "createdAt" >= "eligibleSince" AND "createdAt" >= ${input.from})::int AS "prospectiveProjectsCreatedInWindow",
      COUNT(*) FILTER (WHERE eligible AND "createdAt" >= "eligibleSince" AND "observedAt" >= "eligibleSince" AND "observedAt" >= ${input.from} AND "observedAt" < ${input.to})::int AS "prospectiveFirstSuccessesInWindow",
      COUNT(*) FILTER (WHERE eligible AND "createdAt" < "eligibleSince" AND "observedAt" >= "eligibleSince" AND "observedAt" >= ${input.from} AND "observedAt" < ${input.to})::int AS "legacyFirstObservationsInWindow",
      COUNT(*) FILTER (WHERE eligible AND "createdAt" >= "eligibleSince" AND ("observedAt" IS NULL OR "observedAt" >= ${input.to}))::int AS "prospectiveProjectsWithoutObservation",
      (SELECT COUNT(*)::int FROM "AnalyticsEventOutbox" WHERE "activationCandidate" AND "ts" < ${input.to}) AS "pendingCandidateEvents"
    FROM classified
  `
  return rows[0]
}
