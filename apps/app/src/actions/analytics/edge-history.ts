import dayjs from 'dayjs'
import type { EffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import { getEffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import {
  recordEdgeCaptureFailure,
  recordEdgeCaptureSuccess,
  upsertEdgeRollups,
} from '@/data-access/edge-rollups'
import {
  recordProjectEdgeCaptureFailure,
  recordProjectEdgeCaptureSuccess,
  upsertProjectEdgeRollups,
} from '@/data-access/project-edge-rollups'
import { fetchEdgeAdaptiveHourly } from '@/lib/cloudflare/analytics'
import { fetchProjectEdgeHourly } from '@/lib/cloudflare/project-edge-analytics'

export async function captureConfiguredEdgeHistory(
  settings: EffectiveCloudflareSettings,
) {
  const host = settings.host ?? ''
  const attemptedAt = dayjs()
  try {
    const groups = await fetchEdgeAdaptiveHourly(settings)
    const completedAt = dayjs()
    await upsertEdgeRollups(settings.zoneId, host, groups)
    await recordEdgeCaptureSuccess({
      zoneId: settings.zoneId,
      host,
      groups: groups.length,
      coveredFrom: attemptedAt.subtract(24, 'hour').add(1, 'second').toDate(),
      coveredUntil: completedAt.toDate(),
    })
    return groups.length
  } catch (error) {
    await recordEdgeCaptureFailure({
      zoneId: settings.zoneId,
      host,
      attemptedAt: attemptedAt.toDate(),
      error:
        error instanceof Error ? error.message : 'Cloudflare capture failed',
    })
    throw error
  }
}

export async function captureConfiguredProjectEdgeHistory(
  settings: EffectiveCloudflareSettings,
) {
  if (!settings.accountId) {
    throw new Error(
      'Cloudflare account ID is required for project-attributed edge billing.',
    )
  }
  const attemptedAt = dayjs()
  const coveredFrom = attemptedAt.subtract(24, 'hour').add(1, 'second')
  try {
    const groups = await fetchProjectEdgeHourly(settings, {
      since: coveredFrom.toDate(),
      until: attemptedAt.toDate(),
    })
    const attributedGroups = await upsertProjectEdgeRollups(groups)
    const captureState = await recordProjectEdgeCaptureSuccess({
      groups: attributedGroups,
      coveredFrom: coveredFrom.toDate(),
      coveredUntil: attemptedAt.toDate(),
    })
    return {
      coveredFrom: captureState.coveredFrom ?? coveredFrom.toDate(),
      coveredUntil: captureState.coveredUntil ?? attemptedAt.toDate(),
      groups: attributedGroups,
    }
  } catch (error) {
    await recordProjectEdgeCaptureFailure({
      attemptedAt: attemptedAt.toDate(),
      error:
        error instanceof Error
          ? error.message
          : 'Cloudflare project capture failed',
    })
    throw error
  }
}

// Scheduled capture entrypoint. The billing cron invokes this hourly so edge
// history keeps accumulating even when nobody opens the analytics dashboard.
// It returns only operational counts; credentials and provider payloads never
// leave this action.
export async function captureEdgeHistory() {
  const settings = await getEffectiveCloudflareSettings()
  if (!settings) {
    return { configured: false, groups: 0 }
  }
  const [zoneGroups, projectHistory] = await Promise.all([
    captureConfiguredEdgeHistory(settings),
    captureConfiguredProjectEdgeHistory(settings),
  ])
  return {
    configured: true as const,
    groups: zoneGroups,
    projectCoverage: {
      coveredFrom: projectHistory.coveredFrom,
      coveredUntil: projectHistory.coveredUntil,
    },
    projectGroups: projectHistory.groups,
  }
}
