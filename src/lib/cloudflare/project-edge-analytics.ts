import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import got from 'got'
import type { EffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'

const DATASET = 'keenpix_edge_requests'
const REQUEST_TIMEOUT_MS = 10_000

dayjs.extend(utc)

interface AnalyticsEngineResponse {
  data?: Array<{
    bucketStart: string
    bytes: number | string
    cacheStatus: string
    host: string
    projectId: string
    requests: number | string
    stage: string
    status: number | string
  }>
  errors?: Array<{ message?: string }> | null
}

export interface ProjectEdgeAdaptiveGroup {
  bucketStart: string
  bytes: number
  cacheStatus: string
  host: string
  projectId: string
  requests: number
  stage: string
  status: number
}

// Analytics Engine is the tenant-attribution source. The Worker controls every
// written field, so the project index cannot be supplied by an untrusted client.
// `_sample_interval` preserves correct totals if Cloudflare samples a hot index.
export async function fetchProjectEdgeHourly(
  settings: EffectiveCloudflareSettings,
  input: { since: Date; until: Date },
) {
  if (!settings.accountId) {
    throw new Error('Cloudflare account ID is not configured.')
  }
  const since = dayjs(input.since).utc().format('YYYY-MM-DD HH:mm:ss')
  const until = dayjs(input.until).utc().format('YYYY-MM-DD HH:mm:ss')
  const query = `
    SELECT
      toStartOfHour(timestamp) AS bucketStart,
      index1 AS projectId,
      blob1 AS stage,
      blob2 AS cacheStatus,
      blob3 AS host,
      blob4 AS status,
      SUM(_sample_interval * double2) AS requests,
      SUM(_sample_interval * double1) AS bytes
    FROM ${DATASET}
    WHERE timestamp >= toDateTime('${since}')
      AND timestamp < toDateTime('${until}')
    GROUP BY bucketStart, projectId, stage, cacheStatus, host, status
    ORDER BY bucketStart ASC
  `
  const response = await got
    .post(
      `https://api.cloudflare.com/client/v4/accounts/${settings.accountId}/analytics_engine/sql`,
      {
        body: query,
        headers: {
          authorization: `Bearer ${settings.accountApiToken ?? settings.apiToken}`,
          'content-type': 'text/plain',
        },
        retry: { limit: 1 },
        throwHttpErrors: false,
        timeout: { request: REQUEST_TIMEOUT_MS },
      },
    )
    .json<AnalyticsEngineResponse>()
    .catch(() => {
      throw new Error('Could not reach Cloudflare Analytics Engine.')
    })

  if (response.errors && response.errors.length > 0) {
    throw new Error(
      response.errors[0]?.message ||
        'Cloudflare Analytics Engine query failed.',
    )
  }

  return (response.data ?? [])
    .map((row) => ({
      bucketStart: row.bucketStart,
      bytes: Math.max(0, Math.round(Number(row.bytes))),
      cacheStatus: row.cacheStatus.toLowerCase(),
      host: row.host.toLowerCase(),
      projectId: row.projectId,
      requests: Math.max(0, Math.round(Number(row.requests))),
      stage: row.stage.toLowerCase(),
      status: Number(row.status),
    }))
    .filter(
      (row) =>
        row.projectId &&
        Number.isFinite(row.requests) &&
        Number.isFinite(row.bytes) &&
        Number.isInteger(row.status),
    )
}
