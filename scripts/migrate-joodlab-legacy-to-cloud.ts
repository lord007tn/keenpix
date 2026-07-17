import 'dotenv/config'
import cuid from 'cuid'
import pg from 'pg'

const { Client } = pg

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL

if (!SOURCE_DATABASE_URL) {
  throw new Error('Set SOURCE_DATABASE_URL to the legacy keenpix database URL.')
}

if (!TARGET_DATABASE_URL) {
  throw new Error('Set TARGET_DATABASE_URL to the new cloud database URL.')
}

const DRY_RUN = process.argv.includes('--dry-run')
const SOURCE_ORG_ID = process.env.SOURCE_ORG_ID ?? 'org_default'
const TARGET_ORG_NAME = process.env.TARGET_ORG_NAME ?? 'Joodlab'
const TARGET_ORG_SLUG = process.env.TARGET_ORG_SLUG ?? 'joodlab'
const TARGET_OWNER_EMAIL = process.env.TARGET_OWNER_EMAIL ?? 'fariq@joodlab.com'
const TARGET_MEMBER_ROLE = process.env.TARGET_MEMBER_ROLE ?? 'owner'
const TARGET_COMPLIMENTARY_PLAN =
  process.env.TARGET_COMPLIMENTARY_PLAN ?? 'business'
const BATCH_SIZE = Number(process.env.MIGRATION_BATCH_SIZE ?? 1000)
const SKIP_RAW_LOGS = process.argv.includes('--skip-raw-logs')
const SKIP_ROLLUPS = process.argv.includes('--skip-rollups')

function quoteIdent(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

function placeholders(rowCount: number, columnCount: number) {
  return Array.from({ length: rowCount }, (_, row) => {
    const params = Array.from(
      { length: columnCount },
      (_, column) => `$${row * columnCount + column + 1}`,
    ).join(', ')
    return `(${params})`
  }).join(', ')
}

async function queryCount(
  client: pg.Client,
  sql: string,
  params: unknown[] = [],
) {
  const result = await client.query(sql, params)
  return Number(result.rows[0]?.count ?? 0)
}

async function insertRows(
  client: pg.Client,
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
) {
  if (rows.length === 0) {
    return 0
  }
  const values = rows.flatMap((row) => columns.map((column) => row[column]))
  const result = await client.query(
    `insert into ${quoteIdent(table)} (${columns.map(quoteIdent).join(', ')})
     values ${placeholders(rows.length, columns.length)}
     on conflict do nothing`,
    values,
  )
  return result.rowCount ?? 0
}

async function copyKeysetRows(input: {
  columns: string[]
  keyColumn: string
  keyTable: string
  orderColumn: string
  source: pg.Client
  sourceWhere?: string
  sourceWhereParams?: unknown[]
  table: string
  target: pg.Client
  targetResumeWhere?: string
  targetResumeWhereParams?: unknown[]
  transform: (row: Record<string, unknown>) => Record<string, unknown>
}) {
  let copied = 0
  let scanned = 0
  let lastOrder: unknown = null
  let lastId: unknown = null

  if (!DRY_RUN) {
    const targetFilters = input.targetResumeWhere
      ? `where ${input.targetResumeWhere}`
      : ''
    const resume = await input.target.query(
      `select ${quoteIdent(input.orderColumn)}, ${quoteIdent(input.keyColumn)}
       from ${quoteIdent(input.table)}
       ${targetFilters}
       order by ${quoteIdent(input.orderColumn)} desc, ${quoteIdent(input.keyColumn)} desc
       limit 1`,
      input.targetResumeWhereParams ?? [],
    )
    if (resume.rows[0]) {
      lastOrder = resume.rows[0][input.orderColumn]
      lastId = resume.rows[0][input.keyColumn]
      console.log(
        `${input.table}: resuming after ${String(lastOrder)} / ${String(lastId)}`,
      )
    }
  }

  while (true) {
    const params = [...(input.sourceWhereParams ?? [])]
    const filters = input.sourceWhere ? [input.sourceWhere] : []
    if (lastOrder !== null) {
      params.push(lastOrder, lastId)
      filters.push(
        `(${quoteIdent(input.orderColumn)}, ${quoteIdent(input.keyColumn)}) > ($${params.length - 1}, $${params.length})`,
      )
    }
    params.push(BATCH_SIZE)
    const where = filters.length > 0 ? `where ${filters.join(' and ')}` : ''
    const rows = await input.source.query(
      `select ${input.columns.map(quoteIdent).join(', ')}
       from ${quoteIdent(input.keyTable)}
       ${where}
       order by ${quoteIdent(input.orderColumn)}, ${quoteIdent(input.keyColumn)}
       limit $${params.length}`,
      params,
    )

    if (rows.rows.length === 0) {
      break
    }

    scanned += rows.rows.length
    if (!DRY_RUN) {
      copied += await insertRows(
        input.target,
        input.table,
        input.columns,
        rows.rows.map(input.transform),
      )
    }

    const last = rows.rows.at(-1)
    lastOrder = last?.[input.orderColumn]
    lastId = last?.[input.keyColumn]
    console.log(
      `${input.table}: scanned ${scanned.toLocaleString()} rows, inserted ${copied.toLocaleString()}`,
    )
  }

  return { copied, scanned }
}

async function main() {
  const source = new Client({ connectionString: SOURCE_DATABASE_URL })
  const target = new Client({ connectionString: TARGET_DATABASE_URL })
  await Promise.all([source.connect(), target.connect()])

  try {
    const sourceProjects = await queryCount(
      source,
      'select count(*) from "Project" where "orgId" = $1',
      [SOURCE_ORG_ID],
    )
    const sourceLogs = await queryCount(
      source,
      'select count(*) from "RequestLog" where "orgId" = $1',
      [SOURCE_ORG_ID],
    )
    const sourceRollups = await queryCount(
      source,
      'select count(*) from "AnalyticsRollupHourly" where "orgId" = $1',
      [SOURCE_ORG_ID],
    )
    const sourceApiKeys = await queryCount(
      source,
      'select count(*) from "apikey"',
    )
    console.log(
      JSON.stringify(
        {
          dryRun: DRY_RUN,
          sourceOrgId: SOURCE_ORG_ID,
          targetOrgSlug: TARGET_ORG_SLUG,
          targetOwnerEmail: TARGET_OWNER_EMAIL,
          sourceProjects,
          sourceApiKeys,
          sourceLogs,
          sourceRollups,
        },
        null,
        2,
      ),
    )

    if (DRY_RUN) {
      return
    }

    await target.query('begin')
    const owner = await source.query(
      'select * from "User" where lower(email) = lower($1) limit 1',
      [TARGET_OWNER_EMAIL],
    )
    if (!owner.rows[0]) {
      throw new Error(`Legacy owner user ${TARGET_OWNER_EMAIL} was not found.`)
    }

    const sourceOwner = owner.rows[0]
    const existingOrg = await target.query(
      'select id from "Organization" where slug = $1 limit 1',
      [TARGET_ORG_SLUG],
    )
    const targetOrgId = existingOrg.rows[0]?.id ?? cuid()
    if (!existingOrg.rows[0]) {
      await target.query(
        `insert into "Organization" (id, name, slug, "createdAt")
         values ($1, $2, $3, now())`,
        [targetOrgId, TARGET_ORG_NAME, TARGET_ORG_SLUG],
      )
    }

    const existingUser = await target.query(
      'select id, role from "User" where lower(email) = lower($1) limit 1',
      [TARGET_OWNER_EMAIL],
    )
    const targetUserId = existingUser.rows[0]?.id ?? cuid()
    if (existingUser.rows[0]) {
      await target.query(
        `update "User"
         set "emailVerified" = true,
             name = coalesce(name, $2),
             "updatedAt" = now()
         where id = $1`,
        [targetUserId, sourceOwner.name ?? 'Fariq'],
      )
    } else {
      await target.query(
        `insert into "User" (
           id, email, "emailVerified", name, image, role, banned,
           "createdAt", "updatedAt"
         )
         values ($1, $2, true, $3, $4, 'user', false, $5, now())`,
        [
          targetUserId,
          TARGET_OWNER_EMAIL,
          sourceOwner.name ?? 'Fariq',
          sourceOwner.image ?? null,
          sourceOwner.createdAt ?? new Date(),
        ],
      )
    }

    const sourceCredential = await source.query(
      `select * from "Account"
       where "userId" = $1 and "providerId" = 'credential'
       order by "createdAt" desc
       limit 1`,
      [sourceOwner.id],
    )
    const existingCredential = await target.query(
      `select id from "Account"
       where "userId" = $1 and "providerId" = 'credential'
       limit 1`,
      [targetUserId],
    )
    if (sourceCredential.rows[0] && !existingCredential.rows[0]) {
      await target.query(
        `insert into "Account" (
           id, "userId", "accountId", "providerId", password,
           "createdAt", "updatedAt"
         )
         values ($1, $2, $2, 'credential', $3, now(), now())`,
        [cuid(), targetUserId, sourceCredential.rows[0].password],
      )
    }

    await target.query(
      `insert into "Member" (id, "organizationId", "userId", role, "createdAt")
       values ($1, $2, $3, $4, now())
       on conflict ("userId", "organizationId")
       do update set role = excluded.role`,
      [cuid(), targetOrgId, targetUserId, TARGET_MEMBER_ROLE],
    )

    await target.query(
      `insert into "Subscription" (
         id, "orgId", plan, status, "amountCents", "createdAt", "updatedAt"
       )
       values ($1, $2, $3, 'active', 0, now(), now())
       on conflict ("orgId")
       do update set
         plan = excluded.plan,
         status = 'active',
         "amountCents" = 0,
         "updatedAt" = now()
       where "Subscription"."polarSubscriptionId" is null`,
      [cuid(), targetOrgId, TARGET_COMPLIMENTARY_PLAN],
    )
    await target.query(
      `insert into "SubscriptionGrantAudit" (
         id, "orgId", "actorId", action, plan, "createdAt"
       )
       values ($1, $2, $3, 'migration_requested', $4, now())`,
      [cuid(), targetOrgId, targetUserId, TARGET_COMPLIMENTARY_PLAN],
    )
    await target.query('commit')

    console.log(
      `Prepared target org ${targetOrgId} (${TARGET_ORG_SLUG}) for ${TARGET_OWNER_EMAIL}.`,
    )

    const projects = await source.query(
      `select id, name, origin, "allowedOrigins", color1, color2, "createdAt",
              "autoFormat", "stripMetadata", "defaultQuality", "maxWidth",
              "defaultFit", "defaultDpr"
       from "Project"
       where "orgId" = $1
       order by "createdAt", id`,
      [SOURCE_ORG_ID],
    )
    const existingProjects = await target.query(
      'select id, "orgId" from "Project" where id = any($1)',
      [projects.rows.map((project) => project.id)],
    )
    const conflictingProject = existingProjects.rows.find(
      (project) => project.orgId !== targetOrgId,
    )
    if (conflictingProject) {
      throw new Error(
        `Target project ${conflictingProject.id} belongs to another org; refusing to overwrite it.`,
      )
    }

    await insertRows(
      target,
      'Project',
      [
        'id',
        'orgId',
        'name',
        'origin',
        'allowedOrigins',
        'color1',
        'color2',
        'createdAt',
        'autoFormat',
        'stripMetadata',
        'defaultQuality',
        'maxWidth',
        'defaultFit',
        'defaultDpr',
      ],
      projects.rows.map((project) => ({ ...project, orgId: targetOrgId })),
    )
    console.log(`Project: inserted ${projects.rowCount ?? 0} candidate rows`)

    const apiKeys = await source.query('select * from "apikey" order by id')
    await insertRows(
      target,
      'apikey',
      Object.keys(apiKeys.rows[0] ?? {}),
      apiKeys.rows,
    )
    console.log(`apikey: inserted ${apiKeys.rowCount ?? 0} candidate rows`)

    await copyKeysetRows({
      source,
      target,
      table: 'ApiKeyActivity',
      keyTable: 'ApiKeyActivity',
      orderColumn: 'createdAt',
      keyColumn: 'id',
      columns: [
        'id',
        'apiKeyId',
        'method',
        'path',
        'status',
        'projectId',
        'scope',
        'latencyMs',
        'ipAddress',
        'userAgent',
        'createdAt',
      ],
      transform: (row) => row,
    })

    if (!SKIP_ROLLUPS) {
      await copyKeysetRows({
        source,
        target,
        table: 'AnalyticsRollupHourly',
        keyTable: 'AnalyticsRollupHourly',
        orderColumn: 'bucketStart',
        keyColumn: 'id',
        sourceWhere: '"orgId" = $1',
        sourceWhereParams: [SOURCE_ORG_ID],
        targetResumeWhere: '"orgId" = $1',
        targetResumeWhereParams: [targetOrgId],
        columns: [
          'id',
          'bucketStart',
          'orgId',
          'projectId',
          'sourceHost',
          'country',
          'path',
          'format',
          'status',
          'requests',
          'cachedRequests',
          'optimizedRequests',
          'bytesIn',
          'bytesOut',
          'bytesSaved',
          'latencyMsSum',
          'latencyLe5',
          'latencyLe10',
          'latencyLe20',
          'latencyLe35',
          'latencyLe55',
          'latencyLe80',
          'latencyLe120',
          'latencyLe180',
          'latencyLe260',
          'latencyLe380',
          'latencyLe540',
          'latencyLe800',
          'latencyLe1100',
          'latencyGt1100',
          'updatedAt',
        ],
        transform: (row) => ({ ...row, orgId: targetOrgId }),
      })
    }

    if (!SKIP_RAW_LOGS) {
      await copyKeysetRows({
        source,
        target,
        table: 'RequestLog',
        keyTable: 'RequestLog',
        orderColumn: 'ts',
        keyColumn: 'id',
        sourceWhere: '"orgId" = $1',
        sourceWhereParams: [SOURCE_ORG_ID],
        targetResumeWhere: '"orgId" = $1',
        targetResumeWhereParams: [targetOrgId],
        columns: [
          'id',
          'orgId',
          'projectId',
          'ts',
          'path',
          'width',
          'quality',
          'format',
          'status',
          'cached',
          'latencyMs',
          'bytesIn',
          'bytesOut',
          'bytesSaved',
          'region',
          'country',
          'sourceHost',
        ],
        transform: (row) => ({ ...row, orgId: targetOrgId }),
      })
    }

    console.log('Migration completed without deleting source data.')
  } catch (error) {
    await target.query('rollback').catch(() => {
      console.warn('Rollback was skipped because no transaction was active.')
    })
    throw error
  } finally {
    await Promise.all([source.end(), target.end()])
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
