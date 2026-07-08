import { createServerFn } from '@tanstack/react-start'
import { getBillingState, setSpendCap } from '@/actions/billing'
import {
  authMiddleware,
  requireActiveOrg,
  requireOrgAdmin,
} from '@/lib/auth/guards'
import { bustServingEntitlement } from '@/lib/billing/service-gate'
import { spendCapSchema } from '@/schemas/billing'
import { isCloud } from '@/server/deployment'

// The signed-in org's billing snapshot (plan + status + whether the caller may
// manage billing). Cloud-only in practice — self-host never renders the billing
// UI — but safe to call anywhere: it resolves the active org and reads the local
// Subscription mirror.
export const getBillingStateFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const state = await getBillingState(requireActiveOrg(context))
    // Only owners/admins may change billing; self-host is single-tenant so always.
    const canManage =
      !isCloud() || context.orgRole === 'owner' || context.orgRole === 'admin'
    return { ...state, canManage }
  })

// Owner/admin-only: set or clear the org's overage spending cap.
export const setSpendCapFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(spendCapSchema)
  .handler(async ({ context, data }) => {
    const orgId = requireOrgAdmin(context)
    await setSpendCap(orgId, data.spendCapCents)
    // Drop the cached serving entitlement so the new cap applies immediately
    // rather than after the gate's TTL.
    bustServingEntitlement(orgId)
  })
