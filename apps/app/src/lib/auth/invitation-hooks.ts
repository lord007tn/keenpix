import { APIError } from 'better-auth/api'
import { assertCanAddSeat, BillingQuotaError } from '@/lib/billing/quota'

export async function verifyInvitationSeat(organizationId: string) {
  try {
    await assertCanAddSeat(organizationId)
  } catch (error) {
    if (error instanceof BillingQuotaError) {
      throw new APIError('FORBIDDEN', {
        code: 'INVITATION_PLAN_LIMIT',
        message: error.message,
      })
    }
    throw error
  }
}
