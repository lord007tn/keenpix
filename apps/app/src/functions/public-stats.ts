import { createServerFn } from '@tanstack/react-start'
import { getPublicStats } from '@/actions/marketing/public-stats'

// Public, rounded by the marketing UI, and cached in the action so the landing
// page never turns its authority proof into a database hot path.
export const getPublicStatsFn = createServerFn({ method: 'GET' }).handler(() =>
  getPublicStats(),
)
