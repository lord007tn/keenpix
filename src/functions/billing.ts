import { createServerFn } from '@tanstack/react-start'
import { getBillingState } from '@/actions/billing'
import { authMiddleware, requireActiveOrg } from '@/lib/auth/guards'

// The signed-in org's billing snapshot (plan + status). Cloud-only in practice —
// self-host never renders the billing UI — but safe to call anywhere: it resolves
// the active org and reads the local Subscription mirror.
export const getBillingStateFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => getBillingState(requireActiveOrg(context)))
