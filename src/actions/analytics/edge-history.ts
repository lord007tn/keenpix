import type { EffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import { getEffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import { upsertEdgeRollups } from '@/data-access/edge-rollups'
import { fetchEdgeAdaptiveHourly } from '@/lib/cloudflare/analytics'

export async function captureConfiguredEdgeHistory(
  settings: EffectiveCloudflareSettings,
) {
  const groups = await fetchEdgeAdaptiveHourly(settings)
  await upsertEdgeRollups(settings.zoneId, settings.host ?? '', groups)
  return groups.length
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
  const groups = await captureConfiguredEdgeHistory(settings)
  return { configured: true, groups }
}
