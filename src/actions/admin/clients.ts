import {
  listClientAccounts,
  setOrgSuspension as setOrgSuspensionDb,
} from '@/data-access/admin/clients'
import {
  removeInternalPlanGrant,
  setInternalPlanGrant,
} from '@/data-access/internal-plan-grants'

export function getClientAccounts() {
  return listClientAccounts()
}

// Suspend (kill-switch) or reactivate a tenant org. Suspending stamps the time +
// reason; reactivating clears both. Serving stops/resumes via the gate.
export async function setOrgSuspension(input: {
  orgId: string
  reason?: string
  suspended: boolean
}) {
  await setOrgSuspensionDb(
    input.orgId,
    input.suspended ? new Date() : null,
    input.suspended ? (input.reason ?? null) : null,
  )
  return { suspended: input.suspended }
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
