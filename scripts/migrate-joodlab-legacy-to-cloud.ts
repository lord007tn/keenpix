import 'dotenv/config'
import dayjs from 'dayjs'
import pg from 'pg'

const { Client } = pg

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `Set ${name}; production migration identities have no defaults.`,
    )
  }
  return value
}

const SOURCE_DATABASE_URL = requireEnv('SOURCE_DATABASE_URL')
const TARGET_DATABASE_URL = requireEnv('TARGET_DATABASE_URL')
const SOURCE_ORG_ID = requireEnv('SOURCE_ORG_ID')
const TARGET_ORG_ID = requireEnv('TARGET_ORG_ID')
const TARGET_OWNER_EMAIL = requireEnv('TARGET_OWNER_EMAIL')
const SOURCE_RELEASE = requireEnv('SOURCE_RELEASE')
const TARGET_RELEASE = requireEnv('TARGET_RELEASE')
const MIGRATION_RUN_ID = requireEnv('MIGRATION_RUN_ID')
const CUTOVER_AT = dayjs(requireEnv('MIGRATION_CUTOVER_AT'))
const SOURCE_API_KEY_IDS = requireEnv('SOURCE_API_KEY_IDS')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const API_KEY_PROJECTS = JSON.parse(
  requireEnv('SOURCE_API_KEY_PROJECTS'),
) as Record<string, string>
const BATCH_SIZE = Number(process.env.MIGRATION_BATCH_SIZE ?? 1000)
const EXTRA_ID_BATCH_SIZE = 5000
const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_RAW_LOGS = process.argv.includes('--skip-raw-logs')
const SKIP_ROLLUPS = process.argv.includes('--skip-rollups')

if (
  !CUTOVER_AT.isValid() ||
  CUTOVER_AT.minute() !== 0 ||
  CUTOVER_AT.second() !== 0 ||
  CUTOVER_AT.millisecond() !== 0
) {
  throw new Error('MIGRATION_CUTOVER_AT must be an exact UTC hour boundary.')
}
if (!Number.isInteger(BATCH_SIZE) || BATCH_SIZE < 100 || BATCH_SIZE > 5000) {
  throw new Error('MIGRATION_BATCH_SIZE must be an integer from 100 to 5000.')
}
if (SOURCE_API_KEY_IDS.length === 0) {
  throw new Error('SOURCE_API_KEY_IDS must explicitly select at least one key.')
}
for (const id of SOURCE_API_KEY_IDS) {
  if (!API_KEY_PROJECTS[id]) {
    throw new Error(`SOURCE_API_KEY_PROJECTS is missing ${id}.`)
  }
}

const sourceIdentity = new URL(SOURCE_DATABASE_URL)
const targetIdentity = new URL(TARGET_DATABASE_URL)
if (
  sourceIdentity.hostname === targetIdentity.hostname &&
  sourceIdentity.port === targetIdentity.port &&
  sourceIdentity.pathname === targetIdentity.pathname
) {
  throw new Error('Source and target database identities must differ.')
}

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

async function writeRows(input: {
  client: pg.Client
  columns: string[]
  conflict: string
  rows: Record<string, unknown>[]
  table: string
}) {
  if (input.rows.length === 0) {
    return 0
  }
  const values = input.rows.flatMap((row) =>
    input.columns.map((column) => row[column]),
  )
  const result = await input.client.query(
    `insert into ${quoteIdent(input.table)} (${input.columns.map(quoteIdent).join(', ')})
     values ${placeholders(input.rows.length, input.columns.length)}
     ${input.conflict}`,
    values,
  )
  return result.rowCount ?? 0
}

async function replayRows(input: {
  columns: string[]
  conflict: string
  keyColumn: string
  manifest: string
  orderColumn: string
  source: pg.Client
  sourceParams: unknown[]
  sourceWhere: string
  table: string
  target: pg.Client
  transform: (row: Record<string, unknown>) => Record<string, unknown>
  validate?: (rows: Record<string, unknown>[]) => Promise<void>
}) {
  let affected = 0
  let scanned = 0
  let lastOrder: unknown = null
  let lastId: unknown = null

  const checkpoint = await input.target.query(
    `select "lastOrder", "lastId", scanned
     from "_KeenpixMigrationCheckpoint"
     where "runId" = $1 and "tableName" = $2 and manifest = $3`,
    [MIGRATION_RUN_ID, input.table, input.manifest],
  )
  if (checkpoint.rows[0]) {
    lastOrder = checkpoint.rows[0].lastOrder
    lastId = checkpoint.rows[0].lastId
    scanned = Number(checkpoint.rows[0].scanned)
    console.log(
      `${input.table}: resuming after ${String(lastOrder)} / ${String(lastId)} (${scanned.toLocaleString()} committed)`,
    )
  }

  while (true) {
    const params = [...input.sourceParams]
    const filters = [input.sourceWhere]
    if (lastOrder !== null) {
      params.push(lastOrder, lastId)
      filters.push(
        `(${quoteIdent(input.orderColumn)}, ${quoteIdent(input.keyColumn)}) > ($${params.length - 1}, $${params.length})`,
      )
    }
    params.push(BATCH_SIZE)
    const result = await input.source.query(
      `select ${input.columns.map(quoteIdent).join(', ')}
       from ${quoteIdent(input.table)}
       where ${filters.join(' and ')}
       order by ${quoteIdent(input.orderColumn)}, ${quoteIdent(input.keyColumn)}
       limit $${params.length}`,
      params,
    )
    if (result.rows.length === 0) {
      break
    }

    const rows = result.rows.map(input.transform)
    await input.validate?.(rows)
    affected += await writeRows({
      client: input.target,
      columns: input.columns,
      conflict: input.conflict,
      rows,
      table: input.table,
    })
    scanned += rows.length
    const last = result.rows.at(-1)
    lastOrder = last?.[input.orderColumn]
    lastId = last?.[input.keyColumn]
    await input.target.query(
      `insert into "_KeenpixMigrationCheckpoint" (
         "runId", "tableName", manifest, "lastOrder", "lastId", scanned, "updatedAt"
       ) values ($1, $2, $3, $4, $5, $6, now())
       on conflict ("runId", "tableName") do update set
         manifest = excluded.manifest,
         "lastOrder" = excluded."lastOrder",
         "lastId" = excluded."lastId",
         scanned = excluded.scanned,
         "updatedAt" = excluded."updatedAt"`,
      [
        MIGRATION_RUN_ID,
        input.table,
        input.manifest,
        lastOrder instanceof Date ? lastOrder.toISOString() : String(lastOrder),
        String(lastId),
        scanned,
      ],
    )
    console.log(
      `${input.table}: replayed ${scanned.toLocaleString()} rows (${affected.toLocaleString()} affected)`,
    )
  }
  return scanned
}

async function fingerprint(
  client: pg.Client,
  table: string,
  where: string,
  params: unknown[],
  ignoredColumns: string[] = [],
) {
  const ignored = ignoredColumns
    .map((column) => ` - ${client.escapeLiteral(column)}`)
    .join('')
  const result = await client.query(
    `select count(*)::bigint as count,
            coalesce(sum(hashtextextended((to_jsonb(row)${ignored})::text, 0)::numeric), 0)::text as checksum
     from ${quoteIdent(table)} row
     where ${where}`,
    params,
  )
  return result.rows[0] as { checksum: string; count: string }
}

async function listTargetOnlyIds(input: {
  source: pg.Client
  sourceParams: unknown[]
  sourceWhere: string
  table: string
  target: pg.Client
  targetParams: unknown[]
  targetWhere: string
}) {
  const extraIds: string[] = []
  let lastId: string | undefined

  while (true) {
    const targetParams = [...input.targetParams]
    let cursor = ''
    if (lastId) {
      targetParams.push(lastId)
      cursor = ` and id > $${targetParams.length}`
    }
    targetParams.push(EXTRA_ID_BATCH_SIZE)
    const targetRows = await input.target.query(
      `select id from ${quoteIdent(input.table)}
       where ${input.targetWhere}${cursor}
       order by id
       limit $${targetParams.length}`,
      targetParams,
    )
    if (targetRows.rows.length === 0) {
      break
    }

    const ids = targetRows.rows.map((row) => String(row.id))
    const sourceParams = [...input.sourceParams, ids]
    const sourceRows = await input.source.query(
      `select id from ${quoteIdent(input.table)}
       where ${input.sourceWhere} and id = any($${sourceParams.length}::text[])`,
      sourceParams,
    )
    const sourceIds = new Set(sourceRows.rows.map((row) => String(row.id)))
    extraIds.push(...ids.filter((id) => !sourceIds.has(id)))
    lastId = ids.at(-1)
  }

  return extraIds
}

async function main() {
  const source = new Client({ connectionString: SOURCE_DATABASE_URL })
  const target = new Client({ connectionString: TARGET_DATABASE_URL })
  await Promise.all([source.connect(), target.connect()])

  try {
    await source.query('begin isolation level repeatable read read only')

    const sourceOrg = await source.query('select id from "Org" where id = $1', [
      SOURCE_ORG_ID,
    ])
    const projects = await source.query(
      `select id, name, origin, "allowedOrigins", color1, color2,
              "createdAt", "autoFormat", "stripMetadata",
              "defaultQuality", "maxWidth", "defaultFit", "defaultDpr"
       from "Project" where "orgId" = $1 order by id`,
      [SOURCE_ORG_ID],
    )
    const apiKeys = await source.query(
      'select * from apikey where id = any($1) order by id',
      [SOURCE_API_KEY_IDS],
    )
    const targetOrg = await target.query(
      'select id from "Organization" where id = $1',
      [TARGET_ORG_ID],
    )
    const targetOwner = await target.query(
      `select u.id
       from "Member" m
       join "User" u on u.id = m."userId"
       where m."organizationId" = $1 and lower(u.email) = lower($2)`,
      [TARGET_ORG_ID, TARGET_OWNER_EMAIL],
    )

    if (!sourceOrg.rows[0]) {
      throw new Error(`Source organization ${SOURCE_ORG_ID} was not found.`)
    }
    if (!targetOrg.rows[0]) {
      throw new Error(`Target organization ${TARGET_ORG_ID} was not found.`)
    }
    if (!targetOwner.rows[0]) {
      throw new Error('The reviewed target owner membership was not found.')
    }
    if (projects.rows.length === 0) {
      throw new Error('The source organization has no projects.')
    }
    if (apiKeys.rows.length !== SOURCE_API_KEY_IDS.length) {
      throw new Error(
        'One or more explicitly selected source API keys are missing.',
      )
    }

    const projectIds = projects.rows.map((project) => project.id)
    for (const projectId of Object.values(API_KEY_PROJECTS)) {
      if (!projectIds.includes(projectId)) {
        throw new Error(
          `API-key project ${projectId} is outside the source org.`,
        )
      }
    }
    const projectConflicts = await queryCount(
      target,
      'select count(*) from "Project" where id = any($1) and "orgId" <> $2',
      [projectIds, TARGET_ORG_ID],
    )
    if (projectConflicts > 0) {
      throw new Error('A selected project ID belongs to another target org.')
    }

    const cutover = CUTOVER_AT.toISOString()
    const sourceCounts = {
      apiKeyActivity: await queryCount(
        source,
        'select count(*) from "ApiKeyActivity" where "apiKeyId" = any($1) and "createdAt" < $2',
        [SOURCE_API_KEY_IDS, cutover],
      ),
      requestLog: await queryCount(
        source,
        'select count(*) from "RequestLog" where "orgId" = $1 and ts < $2',
        [SOURCE_ORG_ID, cutover],
      ),
      rollups: await queryCount(
        source,
        'select count(*) from "AnalyticsRollupHourly" where "orgId" = $1 and "bucketStart" < $2',
        [SOURCE_ORG_ID, cutover],
      ),
    }
    console.log(
      JSON.stringify(
        {
          batchSize: BATCH_SIZE,
          cutover,
          dryRun: DRY_RUN,
          runId: MIGRATION_RUN_ID,
          sourceCounts,
          sourceOrgId: SOURCE_ORG_ID,
          sourceRelease: SOURCE_RELEASE,
          targetOrgId: TARGET_ORG_ID,
          targetRelease: TARGET_RELEASE,
        },
        null,
        2,
      ),
    )
    if (DRY_RUN) {
      await source.query('rollback')
      return
    }

    await target.query(
      `select pg_advisory_lock(hashtext('keenpix-joodlab-legacy-migration'))`,
    )
    const manifest = JSON.stringify({
      apiKeyProjects: API_KEY_PROJECTS,
      cutover,
      sourceApiKeyIds: SOURCE_API_KEY_IDS,
      sourceOrgId: SOURCE_ORG_ID,
      sourceRelease: SOURCE_RELEASE,
      targetOrgId: TARGET_ORG_ID,
      targetRelease: TARGET_RELEASE,
    })
    await target.query(`
      create table if not exists "_KeenpixMigrationCheckpoint" (
        "runId" text not null,
        "tableName" text not null,
        manifest text not null,
        "lastOrder" text not null,
        "lastId" text not null,
        scanned bigint not null,
        "updatedAt" timestamptz not null,
        primary key ("runId", "tableName")
      )`)
    const conflictingCheckpoint = await queryCount(
      target,
      `select count(*) from "_KeenpixMigrationCheckpoint"
       where "runId" = $1 and manifest <> $2`,
      [MIGRATION_RUN_ID, manifest],
    )
    if (conflictingCheckpoint > 0) {
      throw new Error(
        'MIGRATION_RUN_ID already belongs to a different migration manifest.',
      )
    }

    const projectColumns = [
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
    ]
    await writeRows({
      client: target,
      columns: projectColumns,
      conflict: `on conflict (id) do update set
        name = excluded.name, origin = excluded.origin,
        "allowedOrigins" = excluded."allowedOrigins", color1 = excluded.color1,
        color2 = excluded.color2, "autoFormat" = excluded."autoFormat",
        "stripMetadata" = excluded."stripMetadata",
        "defaultQuality" = excluded."defaultQuality",
        "maxWidth" = excluded."maxWidth", "defaultFit" = excluded."defaultFit",
        "defaultDpr" = excluded."defaultDpr"
        where "Project"."orgId" = excluded."orgId"`,
      rows: projects.rows.map((project) => ({
        ...project,
        orgId: TARGET_ORG_ID,
      })),
      table: 'Project',
    })

    const apiKeyColumns = Object.keys(apiKeys.rows[0] ?? {})
    await writeRows({
      client: target,
      columns: apiKeyColumns,
      conflict: `on conflict (id) do update set
        name = excluded.name, start = excluded.start, prefix = excluded.prefix,
        key = excluded.key, "configId" = excluded."configId",
        "referenceId" = excluded."referenceId", enabled = excluded.enabled,
        permissions = excluded.permissions, metadata = excluded.metadata,
        "updatedAt" = excluded."updatedAt"`,
      rows: apiKeys.rows.map((apiKey) => ({
        ...apiKey,
        configId: 'internal',
        metadata: JSON.stringify({
          orgId: TARGET_ORG_ID,
          projectId: API_KEY_PROJECTS[apiKey.id],
        }),
        permissions: JSON.stringify({ projects: ['read', 'write'] }),
        referenceId: TARGET_ORG_ID,
        updatedAt: new Date(),
      })),
      table: 'apikey',
    })
    for (const id of SOURCE_API_KEY_IDS) {
      await target.query(
        `insert into "ApiKeyScope" ("apiKeyId", "orgId", "projectId", "createdAt")
         values ($1, $2, $3, now())
         on conflict ("apiKeyId") do update set
           "orgId" = excluded."orgId", "projectId" = excluded."projectId"`,
        [id, TARGET_ORG_ID, API_KEY_PROJECTS[id]],
      )
    }

    const activityColumns = [
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
    ]
    await replayRows({
      columns: activityColumns,
      conflict: `on conflict (id) do update set
        "apiKeyId" = excluded."apiKeyId", method = excluded.method,
        path = excluded.path, status = excluded.status,
        "projectId" = excluded."projectId", scope = excluded.scope,
        "latencyMs" = excluded."latencyMs", "ipAddress" = excluded."ipAddress",
        "userAgent" = excluded."userAgent", "createdAt" = excluded."createdAt"
        where ("ApiKeyActivity"."apiKeyId", "ApiKeyActivity".method,
          "ApiKeyActivity".path, "ApiKeyActivity".status,
          "ApiKeyActivity"."projectId", "ApiKeyActivity".scope,
          "ApiKeyActivity"."latencyMs", "ApiKeyActivity"."ipAddress",
          "ApiKeyActivity"."userAgent", "ApiKeyActivity"."createdAt")
        is distinct from (excluded."apiKeyId", excluded.method, excluded.path,
          excluded.status, excluded."projectId", excluded.scope,
          excluded."latencyMs", excluded."ipAddress", excluded."userAgent",
          excluded."createdAt")`,
      keyColumn: 'id',
      manifest,
      orderColumn: 'createdAt',
      source,
      sourceParams: [SOURCE_API_KEY_IDS, cutover],
      sourceWhere: '"apiKeyId" = any($1) and "createdAt" < $2',
      table: 'ApiKeyActivity',
      target,
      transform: (row) => row,
      validate: async (rows) => {
        const conflicts = await queryCount(
          target,
          'select count(*) from "ApiKeyActivity" where id = any($1) and "apiKeyId" <> all($2)',
          [rows.map((row) => row.id), SOURCE_API_KEY_IDS],
        )
        if (conflicts > 0) {
          throw new Error('ApiKeyActivity ID collision crossed key ownership.')
        }
      },
    })

    const rollupColumns = [
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
    ]
    if (!SKIP_ROLLUPS) {
      await replayRows({
        columns: rollupColumns,
        conflict: `on conflict ("bucketStart", "orgId", "projectId", "sourceHost", country, path, format, status) do update set
          requests = excluded.requests, "cachedRequests" = excluded."cachedRequests",
          "optimizedRequests" = excluded."optimizedRequests",
          "bytesIn" = excluded."bytesIn", "bytesOut" = excluded."bytesOut",
          "bytesSaved" = excluded."bytesSaved", "latencyMsSum" = excluded."latencyMsSum",
          "latencyLe5" = excluded."latencyLe5", "latencyLe10" = excluded."latencyLe10",
          "latencyLe20" = excluded."latencyLe20", "latencyLe35" = excluded."latencyLe35",
          "latencyLe55" = excluded."latencyLe55", "latencyLe80" = excluded."latencyLe80",
          "latencyLe120" = excluded."latencyLe120", "latencyLe180" = excluded."latencyLe180",
          "latencyLe260" = excluded."latencyLe260", "latencyLe380" = excluded."latencyLe380",
          "latencyLe540" = excluded."latencyLe540", "latencyLe800" = excluded."latencyLe800",
          "latencyLe1100" = excluded."latencyLe1100", "latencyGt1100" = excluded."latencyGt1100",
          "updatedAt" = excluded."updatedAt"
          where ("AnalyticsRollupHourly".requests,
            "AnalyticsRollupHourly"."cachedRequests",
            "AnalyticsRollupHourly"."optimizedRequests",
            "AnalyticsRollupHourly"."bytesIn", "AnalyticsRollupHourly"."bytesOut",
            "AnalyticsRollupHourly"."bytesSaved", "AnalyticsRollupHourly"."latencyMsSum",
            "AnalyticsRollupHourly"."latencyLe5", "AnalyticsRollupHourly"."latencyLe10",
            "AnalyticsRollupHourly"."latencyLe20", "AnalyticsRollupHourly"."latencyLe35",
            "AnalyticsRollupHourly"."latencyLe55", "AnalyticsRollupHourly"."latencyLe80",
            "AnalyticsRollupHourly"."latencyLe120", "AnalyticsRollupHourly"."latencyLe180",
            "AnalyticsRollupHourly"."latencyLe260", "AnalyticsRollupHourly"."latencyLe380",
            "AnalyticsRollupHourly"."latencyLe540", "AnalyticsRollupHourly"."latencyLe800",
            "AnalyticsRollupHourly"."latencyLe1100", "AnalyticsRollupHourly"."latencyGt1100",
            "AnalyticsRollupHourly"."updatedAt")
          is distinct from (excluded.requests, excluded."cachedRequests",
            excluded."optimizedRequests", excluded."bytesIn", excluded."bytesOut",
            excluded."bytesSaved", excluded."latencyMsSum", excluded."latencyLe5",
            excluded."latencyLe10", excluded."latencyLe20", excluded."latencyLe35",
            excluded."latencyLe55", excluded."latencyLe80", excluded."latencyLe120",
            excluded."latencyLe180", excluded."latencyLe260", excluded."latencyLe380",
            excluded."latencyLe540", excluded."latencyLe800", excluded."latencyLe1100",
            excluded."latencyGt1100", excluded."updatedAt")`,
        keyColumn: 'id',
        manifest,
        orderColumn: 'bucketStart',
        source,
        sourceParams: [SOURCE_ORG_ID, cutover],
        sourceWhere: '"orgId" = $1 and "bucketStart" < $2',
        table: 'AnalyticsRollupHourly',
        target,
        transform: (row) => ({ ...row, orgId: TARGET_ORG_ID }),
      })
    }

    const logColumns = [
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
    ]
    if (!SKIP_RAW_LOGS) {
      await replayRows({
        columns: logColumns,
        conflict: `on conflict (id) do update set
          "orgId" = excluded."orgId", "projectId" = excluded."projectId",
          ts = excluded.ts, path = excluded.path, width = excluded.width,
          quality = excluded.quality, format = excluded.format,
          status = excluded.status, cached = excluded.cached,
          "latencyMs" = excluded."latencyMs", "bytesIn" = excluded."bytesIn",
          "bytesOut" = excluded."bytesOut", "bytesSaved" = excluded."bytesSaved",
          region = excluded.region, country = excluded.country,
          "sourceHost" = excluded."sourceHost"
          where ("RequestLog"."orgId", "RequestLog"."projectId",
            "RequestLog".ts, "RequestLog".path, "RequestLog".width,
            "RequestLog".quality, "RequestLog".format, "RequestLog".status,
            "RequestLog".cached, "RequestLog"."latencyMs", "RequestLog"."bytesIn",
            "RequestLog"."bytesOut", "RequestLog"."bytesSaved", "RequestLog".region,
            "RequestLog".country, "RequestLog"."sourceHost")
          is distinct from (excluded."orgId", excluded."projectId", excluded.ts,
            excluded.path, excluded.width, excluded.quality, excluded.format,
            excluded.status, excluded.cached, excluded."latencyMs", excluded."bytesIn",
            excluded."bytesOut", excluded."bytesSaved", excluded.region,
            excluded.country, excluded."sourceHost")`,
        keyColumn: 'id',
        manifest,
        orderColumn: 'ts',
        source,
        sourceParams: [SOURCE_ORG_ID, cutover],
        sourceWhere: '"orgId" = $1 and ts < $2',
        table: 'RequestLog',
        target,
        transform: (row) => ({ ...row, orgId: TARGET_ORG_ID }),
        validate: async (rows) => {
          const conflicts = await queryCount(
            target,
            'select count(*) from "RequestLog" where id = any($1) and "orgId" <> $2',
            [rows.map((row) => row.id), TARGET_ORG_ID],
          )
          if (conflicts > 0) {
            throw new Error('RequestLog ID collision crossed tenant ownership.')
          }
        },
      })
    }

    const targetOnlyRequestLogIds = await listTargetOnlyIds({
      source,
      sourceParams: [SOURCE_ORG_ID, cutover],
      sourceWhere: '"orgId" = $1 and ts < $2',
      table: 'RequestLog',
      target,
      targetParams: [TARGET_ORG_ID, projectIds, cutover],
      targetWhere: '"orgId" = $1 and "projectId" = any($2) and ts < $3',
    })
    const targetOnlyRollupIds = await listTargetOnlyIds({
      source,
      sourceParams: [SOURCE_ORG_ID, cutover],
      sourceWhere: '"orgId" = $1 and "bucketStart" < $2',
      table: 'AnalyticsRollupHourly',
      target,
      targetParams: [TARGET_ORG_ID, projectIds, cutover],
      targetWhere:
        '"orgId" = $1 and "projectId" = any($2) and "bucketStart" < $3',
    })
    const targetOnlyActivityIds = await listTargetOnlyIds({
      source,
      sourceParams: [SOURCE_API_KEY_IDS, cutover],
      sourceWhere: '"apiKeyId" = any($1) and "createdAt" < $2',
      table: 'ApiKeyActivity',
      target,
      targetParams: [SOURCE_API_KEY_IDS, cutover],
      targetWhere: '"apiKeyId" = any($1) and "createdAt" < $2',
    })
    console.log(
      `Preserving cloud-only rows: RequestLog=${targetOnlyRequestLogIds.length}, AnalyticsRollupHourly=${targetOnlyRollupIds.length}, ApiKeyActivity=${targetOnlyActivityIds.length}`,
    )

    const checks = [
      {
        ignored: ['orgId'],
        name: 'RequestLog',
        source: await fingerprint(
          source,
          'RequestLog',
          '"orgId" = $1 and ts < $2',
          [SOURCE_ORG_ID, cutover],
          ['orgId'],
        ),
        target: await fingerprint(
          target,
          'RequestLog',
          '"orgId" = $1 and "projectId" = any($2) and ts < $3 and id <> all($4::text[])',
          [TARGET_ORG_ID, projectIds, cutover, targetOnlyRequestLogIds],
          ['orgId'],
        ),
      },
      {
        ignored: ['orgId'],
        name: 'AnalyticsRollupHourly',
        source: await fingerprint(
          source,
          'AnalyticsRollupHourly',
          '"orgId" = $1 and "bucketStart" < $2',
          [SOURCE_ORG_ID, cutover],
          ['orgId'],
        ),
        target: await fingerprint(
          target,
          'AnalyticsRollupHourly',
          '"orgId" = $1 and "projectId" = any($2) and "bucketStart" < $3 and id <> all($4::text[])',
          [TARGET_ORG_ID, projectIds, cutover, targetOnlyRollupIds],
          ['orgId'],
        ),
      },
      {
        ignored: [],
        name: 'ApiKeyActivity',
        source: await fingerprint(
          source,
          'ApiKeyActivity',
          '"apiKeyId" = any($1) and "createdAt" < $2 and id <> all($3::text[])',
          [SOURCE_API_KEY_IDS, cutover, targetOnlyActivityIds],
        ),
        target: await fingerprint(
          target,
          'ApiKeyActivity',
          '"apiKeyId" = any($1) and "createdAt" < $2',
          [SOURCE_API_KEY_IDS, cutover],
        ),
      },
    ]
    for (const check of checks) {
      if (
        check.source.count !== check.target.count ||
        check.source.checksum !== check.target.checksum
      ) {
        throw new Error(`${check.name} reconciliation failed.`)
      }
      console.log(`${check.name}: missing=0 extra=0 mismatched=0`)
    }

    const unusableKeys = await queryCount(
      target,
      `select count(*)
       from apikey k
       left join "ApiKeyScope" s on s."apiKeyId" = k.id
       where k.id = any($1) and (
         k."configId" <> 'internal' or k."referenceId" <> $2 or
         s."orgId" is distinct from $2 or s."projectId" is null
       )`,
      [SOURCE_API_KEY_IDS, TARGET_ORG_ID],
    )
    if (unusableKeys > 0) {
      throw new Error(
        'One or more migrated API keys failed authorization checks.',
      )
    }
    console.log('apikey + ApiKeyScope: missing=0 mismatched=0')
    await target.query(
      `delete from "_KeenpixMigrationCheckpoint" where "runId" = $1`,
      [MIGRATION_RUN_ID],
    )
    console.log('Migration verified without deleting or mutating source data.')
  } finally {
    await source.query('rollback').catch(() => undefined)
    await target
      .query(
        `select pg_advisory_unlock(hashtext('keenpix-joodlab-legacy-migration'))`,
      )
      .catch(() => undefined)
    await Promise.all([source.end(), target.end()])
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
