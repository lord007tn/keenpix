import type { Prisma } from '../generated/prisma/client'
import { measurementPrisma, prisma } from '../index'

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
//
// One statement writes both ledgers, so the standalone transform keeps a single
// round trip and the outbox drain a single bulk statement per batch. The outer
// INSERT is origin_first_image_v1 and its row count is what callers receive.
// origin_first_external_image_v1 needs no enrollment: it only rejects internal/
// test classifications and non-ordinary membership. Its NOT EXISTS skips projects
// already observed at or before the event, so a repeat delivery neither locks the
// row nor writes WAL. CURRENT_TIMESTAMP is converted explicitly because funnel
// days are UTC whatever the session time zone is.
export async function recordProjectFirstImageSuccesses(
  input: {
    projectId: string
    orgId: string
    observedAt?: Date
    external?: boolean
  }[],
  db: Pick<Prisma.TransactionClient, '$executeRaw'> = prisma,
) {
  const deadline = performance.now() + 2000
  for (;;) {
    try {
      return await db.$executeRaw`
    WITH event AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(input)}::jsonb)
        AS event("projectId" text, "orgId" text, "observedAt" timestamp, "external" boolean)
    ), first_external_image AS (
      INSERT INTO "ProjectFirstExternalImage" ("projectId", "orgId", "observedAt", "definitionVersion")
      SELECT p."id", p."orgId", MIN(COALESCE(event."observedAt", CURRENT_TIMESTAMP AT TIME ZONE 'UTC')), 1
      FROM event
      JOIN "Project" p ON p."id" = event."projectId" AND p."orgId" = event."orgId"
      LEFT JOIN "OrganizationActivationPolicy" policy ON policy."orgId" = p."orgId"
      WHERE event."external"
        AND (policy."classification" IS NULL OR policy."classification" NOT IN ('internal', 'test'))
        AND NOT EXISTS (SELECT 1 FROM "ProjectFirstExternalImage" s
          WHERE s."projectId" = p."id"
            AND s."observedAt" <= COALESCE(event."observedAt", CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
        AND EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
          WHERE m."organizationId" = p."orgId" AND m."role" = 'owner' AND u."role" = 'user')
        AND NOT EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
          WHERE m."organizationId" = p."orgId" AND u."role" <> 'user')
      GROUP BY p."id", p."orgId"
      ON CONFLICT ("projectId") DO UPDATE SET "observedAt" = EXCLUDED."observedAt"
        WHERE EXCLUDED."observedAt" < "ProjectFirstExternalImage"."observedAt"
    )
    INSERT INTO "ProjectFirstImageSuccess" ("projectId", "orgId", "observedAt", "definitionVersion")
    SELECT p."id", p."orgId", MIN(COALESCE(event."observedAt", CURRENT_TIMESTAMP)), 1
    FROM event
    JOIN "Project" p ON p."id" = event."projectId" AND p."orgId" = event."orgId"
    JOIN "OrganizationActivationPolicy" policy ON policy."orgId" = p."orgId"
    WHERE policy."classification" = 'customer' AND policy."eligibleSince" IS NOT NULL
      AND policy."eligibleSince" <= COALESCE(event."observedAt", CURRENT_TIMESTAMP)
      AND EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
        WHERE m."organizationId" = p."orgId" AND m."role" = 'owner' AND u."role" = 'user')
      AND NOT EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
        WHERE m."organizationId" = p."orgId" AND u."role" <> 'user')
    GROUP BY p."id", p."orgId"
    ON CONFLICT ("projectId") DO UPDATE SET "observedAt" = EXCLUDED."observedAt"
      WHERE EXCLUDED."observedAt" < "ProjectFirstImageSuccess"."observedAt"
  `
    } catch (error) {
      // Retry a fresh standalone statement, never an already aborted transaction.
      const details = JSON.stringify(error)
      if (
        (db !== prisma && db !== measurementPrisma) ||
        performance.now() + 1500 >= deadline ||
        !details.includes('23505') ||
        !details.includes('ProjectFirstImageSuccess_projectId_orgId_key')
      ) {
        throw error
      }
    }
  }
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

// Operator-only, recorded after every writer is verified. Database time and DO
// NOTHING mean a repeat keeps the original start and coverage is never backdated.
export async function startFirstExternalImageCoverage() {
  const rows = await prisma.$queryRaw<
    { coverageStartedAt: string; started: boolean }[]
  >`
    WITH inserted AS (
      INSERT INTO "FirstExternalImageCoverage" ("definitionVersion", "startedAt")
      VALUES (1, CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      ON CONFLICT ("definitionVersion") DO NOTHING
      RETURNING "startedAt"
    ), coverage AS (
      SELECT "startedAt" FROM inserted
      UNION ALL
      SELECT "startedAt" FROM "FirstExternalImageCoverage" WHERE "definitionVersion" = 1
    )
    SELECT to_char(MAX("startedAt"), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "coverageStartedAt",
      EXISTS (SELECT 1 FROM inserted) AS "started"
    FROM coverage
  `
  return rows[0]
}

// Daily milestone totals for half-open UTC days in [fromDay, toDay). Date-only
// inputs and integer day offsets keep the boundaries independent of the session
// time zone. Only a whole UTC day at or after the coverage start can report a
// first image; a NULL count is Unknown and must never be read as zero.
// Aggregate only: never return identifiers, emails, URLs, or per-customer rows.
export async function getFirstValueFunnelReadout(input: {
  fromDay: string
  toDay: string
}) {
  const [days, summary] = await prisma.$transaction(
    [
      prisma.$queryRaw<
        {
          day: string
          signups: number
          firstProjectWorkspaces: number
          firstExternalImageWorkspaces: number | null
          preexistingFirstExternalImageWorkspaces: number | null
        }[]
      >`
        WITH eligible AS (
          SELECT o."id"
          FROM "Organization" o
          LEFT JOIN "OrganizationActivationPolicy" policy ON policy."orgId" = o."id"
          WHERE (policy."classification" IS NULL OR policy."classification" NOT IN ('internal', 'test'))
            AND EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
              WHERE m."organizationId" = o."id" AND m."role" = 'owner' AND u."role" = 'user')
            AND NOT EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
              WHERE m."organizationId" = o."id" AND u."role" <> 'user')
        ), first_project AS (
          SELECT p."orgId", MIN(p."createdAt") AS "at"
          FROM "Project" p JOIN eligible ON eligible."id" = p."orgId"
          GROUP BY p."orgId"
        ), first_image AS (
          SELECT s."orgId", MIN(s."observedAt") AS "at"
          FROM "ProjectFirstExternalImage" s JOIN eligible ON eligible."id" = s."orgId"
          GROUP BY s."orgId"
        ), days AS (
          SELECT (${input.fromDay}::date + n)::timestamp AS "start",
            (${input.fromDay}::date + n + 1)::timestamp AS "end"
          FROM generate_series(0, ${input.toDay}::date - ${input.fromDay}::date - 1) AS n
        )
        SELECT to_char(d."start", 'YYYY-MM-DD') AS "day",
          (SELECT COUNT(*)::int FROM "User" u
            WHERE u."role" = 'user' AND u."createdAt" >= d."start" AND u."createdAt" < d."end") AS "signups",
          (SELECT COUNT(*)::int FROM first_project f
            WHERE f."at" >= d."start" AND f."at" < d."end") AS "firstProjectWorkspaces",
          CASE WHEN coverage."startedAt" <= d."start"
            AND EXISTS (SELECT 1 FROM "FirstExternalImageVerifiedInterval" v
              WHERE v."startedAt" <= d."start" AND v."endedAt" >= d."end")
            AND NOT EXISTS (SELECT 1 FROM "ImageMeasurementOutbox" q,
              LATERAL jsonb_array_elements(q."candidates") event
              WHERE (event->>'observedAt')::timestamp < d."end")
            AND NOT EXISTS (SELECT 1 FROM "FirstExternalImageInterruption" gap
              WHERE gap."startedAt" < d."end" AND gap."endedAt" > d."start") THEN
            (SELECT COUNT(*)::int FROM first_image i
              WHERE i."at" >= d."start" AND i."at" < d."end")
          END AS "firstExternalImageWorkspaces",
          CASE WHEN coverage."startedAt" <= d."start"
            AND EXISTS (SELECT 1 FROM "FirstExternalImageVerifiedInterval" v
              WHERE v."startedAt" <= d."start" AND v."endedAt" >= d."end")
            AND NOT EXISTS (SELECT 1 FROM "ImageMeasurementOutbox" q,
              LATERAL jsonb_array_elements(q."candidates") event
              WHERE (event->>'observedAt')::timestamp < d."end")
            AND NOT EXISTS (SELECT 1 FROM "FirstExternalImageInterruption" gap
              WHERE gap."startedAt" < d."end" AND gap."endedAt" > d."start") THEN
            (SELECT COUNT(*)::int FROM first_image i
              JOIN first_project f ON f."orgId" = i."orgId"
              WHERE i."at" >= d."start" AND i."at" < d."end" AND f."at" < coverage."startedAt")
          END AS "preexistingFirstExternalImageWorkspaces"
        FROM days d
        LEFT JOIN "FirstExternalImageCoverage" coverage ON coverage."definitionVersion" = 1
        ORDER BY d."start"
      `,
      prisma.$queryRaw<
        {
          coverageStartedAt: string | null
          pendingCandidateEvents: number
          observedWorkspaces: number
        }[]
      >`
        SELECT
          (SELECT to_char("startedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            FROM "FirstExternalImageCoverage" WHERE "definitionVersion" = 1) AS "coverageStartedAt",
          ((SELECT COUNT(*)::int FROM "AnalyticsEventOutbox"
            WHERE "activationCandidate" AND "ts" < ${input.toDay}::date::timestamp)
            + (SELECT COUNT(*)::int FROM "ImageMeasurementOutbox" q,
              LATERAL jsonb_array_elements(q."candidates") event
              WHERE (event->>'observedAt')::timestamp < ${input.toDay}::date::timestamp)) AS "pendingCandidateEvents",
          (SELECT COUNT(DISTINCT s."orgId")::int
            FROM "ProjectFirstExternalImage" s
            LEFT JOIN "OrganizationActivationPolicy" policy ON policy."orgId" = s."orgId"
            WHERE (policy."classification" IS NULL OR policy."classification" NOT IN ('internal', 'test'))
              AND EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
                WHERE m."organizationId" = s."orgId" AND m."role" = 'owner' AND u."role" = 'user')
              AND NOT EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
                WHERE m."organizationId" = s."orgId" AND u."role" <> 'user')) AS "observedWorkspaces"
      `,
    ],
    { isolationLevel: 'RepeatableRead' },
  )
  return { days, ...summary[0] }
}

// Operator attestation only, after all writers are paused/drained and independent
// runtime evidence establishes uninterrupted capture. Never infer this from rows.
export function verifyFirstExternalImageCoverage(input: {
  from: Date
  to: Date
}) {
  return prisma.$executeRaw`
    INSERT INTO "FirstExternalImageVerifiedInterval" ("startedAt", "endedAt")
    SELECT ${input.from}, ${input.to}
    FROM "FirstExternalImageCoverage" c
    WHERE c."definitionVersion" = 1 AND c."startedAt" <= ${input.from}
      AND ${input.from} < ${input.to}
      AND ${input.to} <= CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
      AND NOT EXISTS (SELECT 1 FROM "FirstExternalImageInterruption" g
        WHERE g."startedAt" < ${input.to} AND g."endedAt" > ${input.from})
      AND NOT EXISTS (SELECT 1 FROM "ImageMeasurementOutbox")
      AND NOT EXISTS (SELECT 1 FROM "AnalyticsEventOutbox" WHERE "activationCandidate")
    ON CONFLICT DO NOTHING`
}
