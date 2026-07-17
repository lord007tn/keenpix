import { env } from '@/env/server'

const TERMINAL_STATUS_RE = /(?:timed_out|expired|inactive|blocked|deleted)/

interface CloudflareEnvelope<T> {
  errors?: Array<{ message?: string }>
  result?: T
  success: boolean
}

interface ValidationRecord {
  cname?: string
  cname_target?: string
  txt_name?: string
  txt_value?: string
}

export interface CloudflareCustomHostname {
  hostname: string
  id: string
  ownership_verification?: {
    name?: string
    type?: string
    value?: string
  }
  ssl?: {
    status?: string
    validation_errors?: Array<{ message?: string }>
    validation_records?: ValidationRecord[]
  }
  status?: string
  verification_errors?: string[]
}

export function customDomainsConfigured() {
  return Boolean(
    env.CLOUDFLARE_SAAS_API_TOKEN &&
      env.CLOUDFLARE_SAAS_ZONE_ID &&
      env.CLOUDFLARE_SAAS_CNAME_TARGET &&
      env.CLOUDFLARE_SAAS_WORKER_SCRIPT &&
      env.CLOUDFLARE_SAAS_EDGE_SECRET,
  )
}

export function getCustomDomainCnameTarget() {
  return env.CLOUDFLARE_SAAS_CNAME_TARGET?.trim().toLowerCase()
}

async function cloudflareRequest<T>(path: string, init?: RequestInit) {
  const zoneId = env.CLOUDFLARE_SAAS_ZONE_ID
  const token = env.CLOUDFLARE_SAAS_API_TOKEN
  if (!(zoneId && token)) {
    throw new Error('Custom-domain provisioning is not configured.')
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}${path}`,
    {
      ...init,
      signal: AbortSignal.timeout(15_000),
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...init?.headers,
      },
    },
  )
  const body = (await response
    .json()
    .catch(() => null)) as CloudflareEnvelope<T> | null
  if (!(response.ok && body?.success) || body.result === undefined) {
    const detail = body?.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join('; ')
    throw Object.assign(
      new Error(detail || `Cloudflare returned HTTP ${response.status}.`),
      { status: response.status },
    )
  }
  return body.result
}

export function createCloudflareCustomHostname(hostname: string) {
  return cloudflareRequest<CloudflareCustomHostname>('/custom_hostnames', {
    method: 'POST',
    body: JSON.stringify({
      hostname,
      ssl: {
        bundle_method: 'ubiquitous',
        method: 'http',
        settings: { min_tls_version: '1.2', tls_1_3: 'on' },
        type: 'dv',
      },
    }),
  })
}

export function getCloudflareCustomHostname(id: string) {
  return cloudflareRequest<CloudflareCustomHostname>(
    `/custom_hostnames/${encodeURIComponent(id)}`,
  )
}

export function retryCloudflareCustomHostname(id: string) {
  return cloudflareRequest<CloudflareCustomHostname>(
    `/custom_hostnames/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        ssl: {
          bundle_method: 'ubiquitous',
          method: 'http',
          type: 'dv',
        },
      }),
    },
  )
}

export async function deleteCloudflareCustomHostname(id: string) {
  try {
    await cloudflareRequest<unknown>(
      `/custom_hostnames/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    )
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      return
    }
    throw error
  }
}

export function getCloudflareCustomHostnameState(
  hostname: CloudflareCustomHostname,
) {
  const dnsActive = hostname.status === 'active'
  const sslActive = hostname.ssl?.status === 'active'
  const errors = [
    ...(hostname.verification_errors ?? []),
    ...(hostname.ssl?.validation_errors ?? [])
      .map((error) => error.message)
      .filter((message): message is string => Boolean(message)),
  ]
  let dnsStatus = 'pending'
  if (dnsActive) {
    dnsStatus = 'verified'
  } else if (
    TERMINAL_STATUS_RE.test(hostname.status ?? '') ||
    errors.length > 0
  ) {
    dnsStatus = 'error'
  }
  let sslStatus = 'provisioning'
  if (sslActive) {
    sslStatus = 'active'
  } else if (TERMINAL_STATUS_RE.test(hostname.ssl?.status ?? '')) {
    sslStatus = 'error'
  }
  return {
    dnsStatus,
    lastError: errors[0] ?? null,
    sslStatus,
    verified: dnsActive && sslActive,
  }
}

export function getCloudflareCustomHostnameRecords(
  hostname: CloudflareCustomHostname,
) {
  const target = getCustomDomainCnameTarget()
  if (!target) {
    return []
  }
  const records: Array<{
    name: string
    type: 'CNAME' | 'TXT'
    value: string
  }> = [{ name: hostname.hostname, type: 'CNAME', value: target }]
  const ownership = hostname.ownership_verification
  if (ownership?.name && ownership.value) {
    records.push({
      name: ownership.name,
      type: ownership.type?.toUpperCase() === 'CNAME' ? 'CNAME' : 'TXT',
      value: ownership.value,
    })
  }
  for (const validation of hostname.ssl?.validation_records ?? []) {
    if (validation.cname && validation.cname_target) {
      records.push({
        name: validation.cname,
        type: 'CNAME',
        value: validation.cname_target,
      })
    } else if (validation.txt_name && validation.txt_value) {
      records.push({
        name: validation.txt_name,
        type: 'TXT',
        value: validation.txt_value,
      })
    }
  }
  return records.filter(
    (record, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.type === record.type &&
          candidate.name === record.name &&
          candidate.value === record.value,
      ) === index,
  )
}
