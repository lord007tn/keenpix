import dayjs from 'dayjs'
import { getPlatformSuccessfulDeliveryCount } from '@/data-access/usage'

const CACHE_HOURS = 24
let cachedStats = {
  deliveredImages: 0,
  expiresAt: dayjs(0),
}

// The homepage needs a durable proof point, not a per-request database query.
// Keep the precise aggregate server-side and let the UI round it down to a
// stable whole-million milestone.
export async function getPublicStats() {
  if (
    cachedStats.deliveredImages > 0 &&
    dayjs().isBefore(cachedStats.expiresAt)
  ) {
    return { deliveredImages: cachedStats.deliveredImages }
  }

  cachedStats = {
    deliveredImages: await getPlatformSuccessfulDeliveryCount(),
    expiresAt: dayjs().add(CACHE_HOURS, 'hours'),
  }
  return { deliveredImages: cachedStats.deliveredImages }
}
