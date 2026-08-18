import { useQuery } from '@tanstack/react-query'
import { CheckIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FoundingOfferBanner } from '@/components/app/founding-offer-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getErrorMessage } from '@/errors/common'
import { getPlanPricingFn } from '@/functions/pricing'
import { trackEvent } from '@/lib/analytics/client'
import { authClient } from '@/lib/auth/client'
import {
  catalogPricing,
  PLANS,
  type Plan,
  type PlanId,
  type PlanPricing,
  TRIAL,
} from '@/lib/billing/plans'
import { cn } from '@/lib/cn/utils'

type PlanPrice = PlanPricing['plans'][PlanId]

const GB = 1024 ** 3
const PLAN_ORDER: PlanId[] = ['basic', 'pro', 'business']
// Drop a trailing `.00` so whole-dollar prices read as "$9" not "$9.00".
const TRAILING_ZEROS = /\.00$/

export const PLAN_SELECTION_FALLBACK_PRICING = catalogPricing('standard')

function formatBandwidth(bytes: number): string {
  const gb = bytes / GB
  if (gb >= 1000) {
    return `${(gb / 1000).toLocaleString()} TB`
  }
  return `${gb.toLocaleString()} GB`
}

function formatDomains(customDomains: number | null): string {
  if (customDomains === null) {
    return 'Unlimited custom domains'
  }
  if (customDomains === 0) {
    return 'No custom domains'
  }
  if (customDomains === 1) {
    return '1 custom domain'
  }
  return `${customDomains} custom domains`
}

// Sourced from live Polar pricing (or the catalog fallback), so the displayed
// monthly price always matches the real charge.
function monthlyUsd(price: PlanPrice): number {
  return price.month.amountCents / 100
}

function formatUsd(dollars: number): string {
  return dollars.toFixed(2).replace(TRAILING_ZEROS, '')
}

function planFeatures(plan: Plan, overagePerGbCents: number): string[] {
  const projects =
    plan.maxProjects === null
      ? 'Unlimited projects'
      : `${plan.maxProjects} projects`
  const features = [
    `${formatBandwidth(plan.includedBandwidthBytes)} managed delivery / mo`,
    `$${(overagePerGbCents / 100).toFixed(2)}/GB overage`,
    projects,
    'Unlimited team members',
    formatDomains(plan.customDomains),
    `${plan.historyDays} days analytics history`,
    `${plan.logRetentionDays} days raw log retention${plan.advancedLogs ? ' + search' : ' · latest 200 visible'}`,
  ]
  // Custom domains are live; AI tools remain roadmap-only.
  if (plan.aiCreditsPerMonth > 0) {
    features.push(`${plan.aiCreditsPerMonth} AI credits / mo (coming soon)`)
  }
  return features
}

function checkoutLabel(
  isCurrent: boolean,
  busy: boolean,
  hasPlan: boolean,
): string {
  if (isCurrent) {
    return 'Current plan'
  }
  if (busy) {
    return 'Redirecting…'
  }
  return hasPlan
    ? 'Manage in billing portal'
    : `Start ${TRIAL.days}-day free trial`
}

// The three monthly plan cards, with checkout wired to Polar. Shared by billing
// settings and onboarding so pricing and checkout logic never diverge. Checkout
// attributes the subscription to the active organization.
export function PlanSelection({
  orgId,
  activePlanId,
  hasPlan = false,
  compact = false,
}: {
  orgId: string
  activePlanId?: PlanId | null
  hasPlan?: boolean
  compact?: boolean
}) {
  const [busy, setBusy] = useState<PlanId | null>(null)
  // Live Polar prices so the cards match the real charge; the catalog is the
  // first-paint/self-host/offline fallback so a price never renders blank.
  const { data: pricingData } = useQuery({
    queryKey: ['plan-pricing'],
    queryFn: () => getPlanPricingFn(),
    staleTime: 10 * 60 * 1000,
  })
  const pricing = pricingData ?? PLAN_SELECTION_FALLBACK_PRICING

  async function startCheckout(planId: PlanId) {
    setBusy(planId)
    try {
      const result = await authClient.checkout({
        slug: `${planId}-month`,
        referenceId: orgId,
      })
      const url = result?.data?.url
      if (url) {
        trackEvent('begin_checkout', {
          plan: planId,
          billing_interval: 'month',
        })
        window.location.href = url
        return
      }
      if (result?.error) {
        throw new Error(result.error.message ?? 'Could not start checkout')
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FoundingOfferBanner compact offer={pricing.foundingOffer} />
      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId]
          const price = pricing.plans[planId]
          const isCurrent = activePlanId === planId
          const highlight = planId === 'pro'
          return (
            <Card
              className={cn(
                'flex flex-col',
                highlight && 'border-primary shadow-sm',
              )}
              key={planId}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{plan.name}</span>
                  {highlight ? <Badge>Most popular</Badge> : null}
                </div>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="font-semibold text-3xl">
                    ${formatUsd(monthlyUsd(price))}
                  </span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {compact ? null : (
                  <ul className="flex flex-col gap-2 text-sm">
                    {planFeatures(plan, price.overagePerGbCents).map(
                      (feature) => (
                        <li className="flex items-start gap-2" key={feature}>
                          <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ),
                    )}
                  </ul>
                )}
                <Button
                  className="mt-auto"
                  disabled={isCurrent || busy === planId || hasPlan}
                  onClick={() => startCheckout(planId)}
                  variant={highlight ? 'default' : 'outline'}
                >
                  {checkoutLabel(isCurrent, busy === planId, hasPlan)}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {hasPlan ? null : (
        <p className="text-center text-muted-foreground text-sm">
          Every plan starts with a {TRIAL.days}-day free trial — full plan
          features, up to {TRIAL.maxProjects} projects and{' '}
          {TRIAL.bandwidthBytes / GB} GB delivered, and trial usage is never
          billed. Your card isn’t charged until the trial ends, and you can
          cancel anytime.
        </p>
      )}
      {hasPlan ? (
        <p className="text-center text-muted-foreground text-sm">
          Change plans from Manage billing above. Polar applies the configured
          proration rules and keeps one subscription for this workspace.
        </p>
      ) : null}
    </div>
  )
}
