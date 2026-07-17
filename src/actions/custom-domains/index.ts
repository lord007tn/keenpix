import {
  countOrgCustomDomains,
  createCustomDomainRecord,
  deleteCustomDomainRecord,
  getCustomDomain,
  getProjectIdByCustomHostname,
  listProjectCustomDomains,
  updateCustomDomainRecord,
} from '@/data-access/custom-domains'
import { getProject } from '@/data-access/projects'
import { getCustomDomainAddonUnits } from '@/data-access/subscription-addons'
import { getOrgPlan } from '@/data-access/subscriptions'
import type { Prisma } from '@/generated/prisma/client'
import {
  type CloudflareCustomHostname,
  createCloudflareCustomHostname,
  createCloudflareCustomHostnameRoute,
  customDomainsConfigured,
  deleteCloudflareCustomHostname,
  deleteCloudflareCustomHostnameRoute,
  getCloudflareCustomHostname,
  getCloudflareCustomHostnameRecords,
  getCloudflareCustomHostnameState,
  getCustomDomainCnameTarget,
  retryCloudflareCustomHostname,
} from '@/integrations/cloudflare/custom-hostnames'
import { getAppUrl, isCloud } from '@/server/deployment'

function providerJson(hostname: CloudflareCustomHostname) {
  // Prisma's JSON boundary cannot model optional provider fields directly;
  // serializing also strips undefined values before persistence.
  return JSON.parse(JSON.stringify(hostname)) as Prisma.InputJsonValue
}

function providerHostname(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return
  }
  return value as unknown as CloudflareCustomHostname
}

function customDomainView(
  domain: Awaited<ReturnType<typeof listProjectCustomDomains>>[number],
) {
  const provider = providerHostname(domain.providerData)
  return {
    createdAt: domain.createdAt,
    dnsStatus: domain.dnsStatus,
    hostname: domain.hostname,
    id: domain.id,
    lastCheckedAt: domain.lastCheckedAt,
    lastError: domain.lastError,
    records: provider ? getCloudflareCustomHostnameRecords(provider) : [],
    sslStatus: domain.sslStatus,
    transformUrl: `https://${domain.hostname}/img/<source-url>`,
  }
}

export async function listCustomDomains(orgId: string, projectId: string) {
  const [project, plan, domains, configured, addonUnits] = await Promise.all([
    getProject(projectId, orgId),
    isCloud() ? getOrgPlan(orgId) : null,
    listProjectCustomDomains(orgId, projectId),
    Promise.resolve(customDomainsConfigured()),
    isCloud() ? getCustomDomainAddonUnits(orgId) : Promise.resolve(0),
  ])
  if (!project) {
    throw new Error('Project not found')
  }
  const used = await countOrgCustomDomains(orgId)
  let limit: number | null = null
  if (isCloud() && plan?.customDomains !== null) {
    limit = (plan?.customDomains ?? 0) + addonUnits
  }
  return {
    access: {
      configured,
      limit,
      planId: isCloud() ? (plan?.id ?? null) : null,
      planName: isCloud() ? (plan?.name ?? 'No plan') : 'Self-hosted',
      target: getCustomDomainCnameTarget() ?? null,
      used,
    },
    domains: domains.map(customDomainView),
  }
}

export async function createCustomDomain(
  orgId: string,
  projectId: string,
  hostname: string,
) {
  if (!isCloud()) {
    throw new Error(
      'Managed custom domains are available on Keenpix Cloud. Configure your reverse proxy directly when self-hosting.',
    )
  }
  if (!customDomainsConfigured()) {
    throw new Error('Custom-domain provisioning is temporarily unavailable.')
  }
  const [project, plan, used, addonUnits] = await Promise.all([
    getProject(projectId, orgId),
    getOrgPlan(orgId),
    countOrgCustomDomains(orgId),
    getCustomDomainAddonUnits(orgId),
  ])
  if (!project) {
    throw new Error('Project not found')
  }
  if (!plan || plan.customDomains === 0) {
    throw new Error('Upgrade to Pro or Business to add a custom domain.')
  }
  const limit =
    plan.customDomains === null ? null : plan.customDomains + addonUnits
  if (limit !== null && used >= limit) {
    throw new Error(
      plan.id === 'business' && addonUnits === 0
        ? 'Your Business plan includes 10 custom domains. Add a domain pack from Billing to connect five more.'
        : `Your plan and add-ons include ${limit} custom domains.`,
    )
  }
  const appHostname = new URL(getAppUrl()).hostname.toLowerCase()
  const target = getCustomDomainCnameTarget()
  if (hostname === appHostname || hostname === target) {
    throw new Error('Choose a customer-owned hostname, not a Keenpix hostname.')
  }

  let provisioned: CloudflareCustomHostname | undefined
  let workerRouteId: string | undefined
  try {
    provisioned = await createCloudflareCustomHostname(hostname)
    const route = await createCloudflareCustomHostnameRoute(hostname)
    workerRouteId = route.id
    provisioned = { ...provisioned, workerRouteId }
    const state = getCloudflareCustomHostnameState(provisioned)
    const created = await createCustomDomainRecord({
      dnsStatus: state.dnsStatus,
      hostname,
      lastError: state.lastError,
      limit,
      orgId,
      projectId,
      providerData: providerJson(provisioned),
      providerHostnameId: provisioned.id,
      sslStatus: state.sslStatus,
      verifiedAt: state.verified ? new Date() : null,
    })
    return customDomainView(created)
  } catch (error) {
    if (workerRouteId) {
      await deleteCloudflareCustomHostnameRoute(workerRouteId).catch(
        () => undefined,
      )
    }
    if (provisioned) {
      await deleteCloudflareCustomHostname(provisioned.id).catch(
        () => undefined,
      )
    }
    const detail = error instanceof Error ? error.message : 'Unknown error.'
    throw new Error(`Could not provision ${hostname}: ${detail}`)
  }
}

export async function refreshCustomDomain(
  orgId: string,
  projectId: string,
  id: string,
) {
  const domain = await getCustomDomain(orgId, projectId, id)
  if (!domain) {
    throw new Error('Custom domain not found')
  }
  let current = await getCloudflareCustomHostname(domain.providerHostnameId)
  if (current.status !== 'active' || current.ssl?.status !== 'active') {
    current = await retryCloudflareCustomHostname(domain.providerHostnameId)
  }
  const stored = providerHostname(domain.providerData)
  current = { ...current, workerRouteId: stored?.workerRouteId }
  const state = getCloudflareCustomHostnameState(current)
  const updated = await updateCustomDomainRecord(domain.id, {
    dnsStatus: state.dnsStatus,
    lastError: state.lastError,
    providerData: providerJson(current),
    sslStatus: state.sslStatus,
    verifiedAt: state.verified ? (domain.verifiedAt ?? new Date()) : null,
  })
  return customDomainView(updated)
}

export async function deleteCustomDomain(
  orgId: string,
  projectId: string,
  id: string,
) {
  const domain = await getCustomDomain(orgId, projectId, id)
  if (!domain) {
    throw new Error('Custom domain not found')
  }
  const provider = providerHostname(domain.providerData)
  if (provider?.workerRouteId) {
    await deleteCloudflareCustomHostnameRoute(provider.workerRouteId)
  }
  await deleteCloudflareCustomHostname(domain.providerHostnameId)
  await deleteCustomDomainRecord(domain.id)
  return { deleted: true }
}

export function resolveCustomDomainProject(hostname: string) {
  return getProjectIdByCustomHostname(hostname.toLowerCase())
}
