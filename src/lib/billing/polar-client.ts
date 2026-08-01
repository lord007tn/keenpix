import { Polar } from '@polar-sh/sdk'
import { env } from '@/env/server'
import { isCloud } from '@/server/deployment'

// Single place that decides whether Polar is reachable and constructs the client.
// Returns null in self-host or when no access token is configured, so every caller
// degrades the same way: billing routes stay unmounted, and price display falls
// back to the code catalog. Keeps the isCloud()/POLAR_TOKEN guard in one spot.
export function createPolarClient(): Polar | null {
  if (!(isCloud() && env.POLAR_TOKEN)) {
    return null
  }
  return new Polar({
    accessToken: env.POLAR_TOKEN,
    server: env.POLAR_SERVER ?? 'sandbox',
  })
}
