import {
  type CloudflareSettingsInput,
  getEffectiveCloudflareSettings,
  updateCloudflareSettings as updateCloudflareSettingsInDb,
} from '@/data-access/admin/cloudflare'
import { verifyCloudflareAccess } from '@/lib/cloudflare/analytics'

export function updateCloudflareSettings(input: CloudflareSettingsInput) {
  return updateCloudflareSettingsInDb(input)
}

export async function testCloudflareConnection() {
  const settings = await getEffectiveCloudflareSettings()
  if (!settings) {
    throw new Error('Cloudflare analytics is not configured')
  }
  await verifyCloudflareAccess(settings)
  return { ok: true }
}
