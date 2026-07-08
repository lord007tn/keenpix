import { listClientAccounts } from '@/data-access/admin/clients'
import {
  removeInternalPlanGrant,
  setInternalPlanGrant,
} from '@/data-access/internal-plan-grants'

export function getClientAccounts() {
  return listClientAccounts()
}

export async function updateClientInternalPlan(input: {
  grantedById: string
  orgId: string
  plan: 'none' | 'basic' | 'pro' | 'business'
  reason?: string
}) {
  if (input.plan === 'none') {
    await removeInternalPlanGrant(input.orgId)
    return { orgId: input.orgId, plan: null }
  }

  await setInternalPlanGrant({
    orgId: input.orgId,
    plan: input.plan,
    reason: input.reason,
    grantedById: input.grantedById,
  })
  return { orgId: input.orgId, plan: input.plan }
}
