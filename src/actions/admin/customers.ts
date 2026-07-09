import dayjs from 'dayjs'
import {
  getCustomerAccount,
  listCustomerAccounts,
  setOrgSuspension as setOrgSuspensionDb,
} from '@/data-access/admin/customers'
import {
  removeInternalPlanGrant,
  setInternalPlanGrant,
} from '@/data-access/internal-plan-grants'

export function getCustomerAccounts() {
  return listCustomerAccounts()
}

export function getCustomerAccountById(orgId: string) {
  return getCustomerAccount(orgId)
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

export async function updateCustomerInternalPlan(input: {
  grantedById: string
  orgId: string
  plan: 'none' | 'basic' | 'pro' | 'business'
  reason?: string
  expiresAt?: string
}) {
  if (input.plan === 'none') {
    await removeInternalPlanGrant(input.orgId)
    return { orgId: input.orgId, plan: null }
  }

  // End of the chosen day, so a grant is valid through its expiry date.
  const expiresAt = input.expiresAt ? dayjs(input.expiresAt).endOf('day') : null
  // Reject a past expiry — it would write an immediately-inactive grant, giving
  // the operator a false "granted" with no effect. Belt-and-suspenders over the
  // client-side block in the plan-change UI.
  if (expiresAt && !expiresAt.isAfter(dayjs())) {
    throw new Error('Grant expiry must be in the future.')
  }

  await setInternalPlanGrant({
    orgId: input.orgId,
    plan: input.plan,
    reason: input.reason,
    grantedById: input.grantedById,
    expiresAt: expiresAt ? expiresAt.toDate() : null,
  })
  return { orgId: input.orgId, plan: input.plan }
}
