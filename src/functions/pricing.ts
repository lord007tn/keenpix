import { createServerFn } from '@tanstack/react-start'
import { getPlanPricing } from '@/actions/billing/plan-pricing'

// Public (no auth middleware): displayed plan pricing for the marketing landing
// page and the in-app plan cards. Sourced from live Polar products with a catalog
// fallback, so it's safe to call unauthenticated and returns sensibly in self-host.
export const getPlanPricingFn = createServerFn({ method: 'GET' }).handler(() =>
  getPlanPricing(),
)
