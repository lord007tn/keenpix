import { checkout, polar, portal, webhooks } from '@polar-sh/better-auth'
import { upsertSubscriptionAddon } from '@/data-access/subscription-addons'
import {
  countFoundingCustomers,
  upsertSubscription,
  upsertSubscriptionWithCustomer,
} from '@/data-access/subscriptions'
import { env } from '@/env/server'
import { notifyPaymentIssue } from '@/lib/billing/alerts'
import { FOUNDING_CUSTOMER_LIMIT } from '@/lib/billing/plans'
import { errorContext, logger } from '@/lib/logger/logger'
import { listCheckoutProducts } from './polar-checkout-products'
import { createPolarClient } from './polar-client'
import {
  mapSubscriptionAddonSnapshot,
  mapSubscriptionSnapshot,
  type PolarSubscriptionData,
} from './subscription-mapping'

// Mirror a Polar subscription into our local snapshot so the hot path reads
// entitlements from Postgres, never Polar. `status` is passed explicitly since
// the webhook event names the transition (active/canceled/revoked).
async function syncSubscription(
  sub: PolarSubscriptionData,
  status: string,
): Promise<void> {
  const snapshot = mapSubscriptionSnapshot(sub, status)
  if (!snapshot) {
    const addon = mapSubscriptionAddonSnapshot(sub, status)
    if (addon) {
      await upsertSubscriptionAddon(addon)
    }
    return
  }
  const customerId = sub.customer?.id
  let previousStatus: string | null = null
  if (customerId) {
    const result = await upsertSubscriptionWithCustomer(snapshot, customerId)
    previousStatus = result.previousStatus
  } else {
    // No customer id on the payload: still record entitlement so a paying org
    // isn't wrongly denied service, but log loudly — without a BillingCustomer
    // the org won't be metered until an operator reconciles it.
    const result = await upsertSubscription(snapshot)
    previousStatus = result.previousStatus
    logger.error(
      errorContext(
        new Error(
          `Polar subscription ${snapshot.polarSubscriptionId} for org ${snapshot.orgId} synced without a customer id`,
        ),
      ),
      'polar subscription missing customer id — org will not be metered',
    )
  }
  // Heads-up email on ENTERING dunning. Never lets an email failure fail the
  // webhook — Polar would retry the delivery and re-run the whole sync.
  try {
    await notifyPaymentIssue(
      snapshot.orgId,
      snapshot.currentPeriodStart ?? null,
      snapshot.status,
      previousStatus,
    )
  } catch (error) {
    logger.error(errorContext(error), 'dunning notification failed')
  }
}

// Land back on the dashboard: a first-time subscriber resumes the onboarding
// checklist there (step 1 now checked); an existing customer sees their KPIs.
const SUCCESS_URL = '/app/dashboard'

// Slug map the checkout endpoint resolves against, built live from the Polar
// product catalog: each monthly subscription product carries `plan` +
// `interval=month` metadata, so `${plan}-month` is a stable slug the billing UI
// can request without hardcoding sandbox/production product ids. Failures
// resolve to an empty map (checkout errors cleanly) rather than throw.
// The Polar billing plugin for better-auth. Returns null unless running in cloud
// with an access token configured, so self-host (and any cloud deploy without
// billing credentials) never constructs a Polar client or mounts billing routes.
export function buildPolarPlugin() {
  const client = createPolarClient()
  if (!client) {
    return null
  }
  const checkoutPlugin = checkout({
    products: async () => {
      const claimed = await countFoundingCustomers().catch(
        () => FOUNDING_CUSTOMER_LIMIT,
      )
      return listCheckoutProducts(
        client,
        claimed < FOUNDING_CUSTOMER_LIMIT ? 'founding' : 'standard',
      )
    },
    successUrl: env.POLAR_SUCCESS_URL ?? SUCCESS_URL,
    authenticatedUsersOnly: true,
  })
  const portalPlugin = portal()
  // Webhooks are optional: without a signing secret we still allow checkout and
  // the customer portal, we just can't verify inbound events to sync state.
  if (env.POLAR_WEBHOOK_SECRET) {
    const webhooksPlugin = webhooks({
      secret: env.POLAR_WEBHOOK_SECRET,
      // Every non-terminal transition mirrors Polar's OWN status. In particular
      // `subscription.canceled` fires for cancel-at-period-end while the status
      // stays `active` until the period ends, so we must NOT hardcode `canceled`
      // there — that would drop a paid-through org out of entitlement mid-cycle.
      // `subscription.created` carries `trialing` for new trials (otherwise the
      // trial is never mirrored and the org is gated for the whole trial).
      onSubscriptionCreated: (payload) =>
        syncSubscription(payload.data, payload.data.status),
      onSubscriptionActive: (payload) =>
        syncSubscription(payload.data, payload.data.status),
      onSubscriptionUpdated: (payload) =>
        syncSubscription(payload.data, payload.data.status),
      onSubscriptionCanceled: (payload) =>
        syncSubscription(payload.data, payload.data.status),
      onSubscriptionUncanceled: (payload) =>
        syncSubscription(payload.data, payload.data.status),
      // Revocation is the definitive cutoff: force `revoked` regardless of the
      // payload status so entitlement ends here and nowhere earlier.
      onSubscriptionRevoked: (payload) =>
        syncSubscription(payload.data, 'revoked'),
    })
    return polar({
      client,
      // Deliberately NOT createCustomerOnSignUp: that makes sign-up depend on a
      // live Polar call (and Polar's email-deliverability validation), so a
      // Polar hiccup would 500 every sign-up. The customer is created lazily at
      // first checkout instead, and subscriptions link to the org via the
      // checkout `referenceId`, not the customer — so nothing here needs it.
      createCustomerOnSignUp: false,
      use: [checkoutPlugin, portalPlugin, webhooksPlugin],
    })
  }
  return polar({
    client,
    createCustomerOnSignUp: false,
    use: [checkoutPlugin, portalPlugin],
  })
}
