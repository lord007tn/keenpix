import {
  getCustomerAccount,
  listCustomerAccounts,
  setOrgSuspension as setOrgSuspensionDb,
} from '@/data-access/admin/customers'
import {
  removeComplimentarySubscription,
  setComplimentarySubscription,
} from '@/data-access/admin/subscriptions'
import { addCustomerFinance } from './finance'

export async function getCustomerAccounts() {
  return addCustomerFinance(await listCustomerAccounts())
}

export async function getCustomerAccountById(orgId: string) {
  const account = await getCustomerAccount(orgId)
  if (!account) {
    return null
  }
  return (await addCustomerFinance([account]))[0]
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

export function updateCustomerComplimentaryPlan(input: {
  actorId: string
  orgId: string
  plan: 'free' | 'basic' | 'pro' | 'business'
}) {
  if (input.plan === 'free') {
    return removeComplimentarySubscription({
      actorId: input.actorId,
      orgId: input.orgId,
    })
  }
  return setComplimentarySubscription(input)
}
