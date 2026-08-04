import {
  claimBillingAlert,
  listAlertableSubscriptions,
  listBillingRecipients,
} from '@/data-access/billing-alerts'
import { deliveredBytesSince } from '@/data-access/usage'
import { getPlan, TRIAL } from '@/lib/billing/plans'
import { sendPlatformEmail } from '@/lib/email/send'
import { errorContext, logger } from '@/lib/logger/logger'
import { getAppUrl, isCloud } from '@/server/deployment'
import { humanBytes } from '@/shared/format'

// Start of the current UTC month — the fallback alert period for a subscription
// without a period anchor (mirrors quota.ts / getBillingState).
function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

interface AlertMail {
  kind: string
  subject: string
  text: string
}

// Claim the (org, kind, period) slot, then email every billing recipient. The
// claim-first ordering means a crashed send is NOT retried — for advisory alerts
// that's the right failure mode (losing one email beats double-alerting on every
// cron overlap).
async function sendAlert(
  orgId: string,
  periodStart: Date,
  mail: AlertMail,
): Promise<boolean> {
  const claimed = await claimBillingAlert(orgId, mail.kind, periodStart)
  if (!claimed) {
    return false
  }
  const recipients = await listBillingRecipients(orgId)
  const billingUrl = `${getAppUrl()}/app/settings?section=billing`
  const text = `${mail.text}\n\nManage billing: ${billingUrl}\n\n— Keenpix`
  for (const to of recipients) {
    try {
      await sendPlatformEmail({ to, subject: mail.subject, text })
    } catch (error) {
      logger.error(
        { ...errorContext(error), orgId, kind: mail.kind },
        'billing alert email failed',
      )
    }
  }
  return true
}

interface AlertableSubscription {
  currentPeriodStart: Date | null
  organization: { name: string }
  orgId: string
  overagePerGbCents: number
  plan: string
  status: string
}

// The usage thresholds one subscription has crossed this period, as alert mails.
// Pure decision logic so it stays unit-testable without a database.
export function usageAlertsFor(
  sub: AlertableSubscription,
  deliveredBytes: number,
): AlertMail[] {
  const plan = getPlan(sub.plan)
  if (!plan) {
    return []
  }
  const org = sub.organization.name
  const alerts: AlertMail[] = []
  if (sub.status === 'trialing') {
    // Trials meter against the trial allowance (delivery pauses there), and
    // nothing is billed — so trial alerts talk about the pause, not money.
    if (deliveredBytes >= TRIAL.bandwidthBytes) {
      alerts.push({
        kind: 'trial_allowance_reached',
        subject: `Keenpix: ${org} reached its trial delivery allowance`,
        text: `Your free trial has delivered its included ${humanBytes(TRIAL.bandwidthBytes)}, so image delivery is paused. Delivery resumes automatically when your trial converts to a paid plan — or you can switch to a paid plan now to resume immediately. Trial usage is never billed.`,
      })
    } else if (deliveredBytes >= TRIAL.bandwidthBytes * 0.8) {
      alerts.push({
        kind: 'trial_allowance_80',
        subject: `Keenpix: ${org} used 80% of its trial delivery allowance`,
        text: `Your free trial has delivered ${humanBytes(deliveredBytes)} of its included ${humanBytes(TRIAL.bandwidthBytes)}. When the allowance is used up, delivery pauses until the trial converts. Trial usage is never billed.`,
      })
    }
    return alerts
  }
  const included = plan.includedBandwidthBytes
  const overagePerGbCents =
    sub.overagePerGbCents > 0 ? sub.overagePerGbCents : plan.overagePerGbCents
  const overageBytes = Math.max(0, deliveredBytes - included)
  if (overageBytes > 0) {
    alerts.push({
      kind: 'usage_100',
      subject: `Keenpix: ${org} used all included delivery this period`,
      text: `${org} has delivered ${humanBytes(deliveredBytes)} this period — past the ${humanBytes(included)} included in your ${plan.name} plan. Additional delivery keeps serving and is billed at $${(overagePerGbCents / 100).toFixed(2)}/GB at the end of the billing period.`,
    })
  } else if (deliveredBytes >= included * 0.8) {
    alerts.push({
      kind: 'usage_80',
      subject: `Keenpix: ${org} used 80% of its included delivery`,
      text: `${org} has delivered ${humanBytes(deliveredBytes)} of the ${humanBytes(included)} included in your ${plan.name} plan this period. Past the allowance, delivery is billed at $${(overagePerGbCents / 100).toFixed(2)}/GB.`,
    })
  }
  return alerts
}

export interface UsageAlertResult {
  checked: number
  sent: number
}

// Hourly sweep (invoked by the usage cron, after metering): evaluate every
// serving subscription against its thresholds and email each crossed one exactly
// once per period. No-op in self-host.
export async function sendUsageAlerts(): Promise<UsageAlertResult> {
  if (!isCloud()) {
    return { checked: 0, sent: 0 }
  }
  const subs = await listAlertableSubscriptions()
  let sent = 0
  for (const sub of subs) {
    try {
      const periodStart = sub.currentPeriodStart ?? startOfMonthUtc(new Date())
      const { bytes } = await deliveredBytesSince(sub.orgId, periodStart)
      for (const mail of usageAlertsFor(sub, bytes)) {
        if (await sendAlert(sub.orgId, periodStart, mail)) {
          sent += 1
        }
      }
    } catch (error) {
      logger.error(
        { ...errorContext(error), orgId: sub.orgId },
        'usage alert sweep failed for org',
      )
    }
  }
  return { checked: subs.length, sent }
}

const DUNNING = new Set(['past_due', 'unpaid'])

// Webhook-triggered: email the org the moment its subscription ENTERS dunning
// (payment failed). One email per period; Polar keeps retrying payment and we
// keep serving through the grace window, so this is a heads-up, not a cutoff.
export async function notifyPaymentIssue(
  orgId: string,
  orgPeriodStart: Date | null,
  status: string,
  previousStatus: string | null,
): Promise<void> {
  if (!isCloud()) {
    return
  }
  if (!DUNNING.has(status) || DUNNING.has(previousStatus ?? '')) {
    return
  }
  const periodStart = orgPeriodStart ?? startOfMonthUtc(new Date())
  await sendAlert(orgId, periodStart, {
    kind: 'payment_failed',
    subject: 'Keenpix: your payment didn’t go through',
    text: 'Your last Keenpix payment failed. Image delivery continues for now while the payment is retried, but it will stop if billing isn’t brought current. Please update your payment method in billing settings.',
  })
}
