import { useQuery } from '@tanstack/react-query'
import { CheckIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getErrorMessage } from '@/errors/common'
import { getPlanPricingFn } from '@/functions/pricing'
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

type Interval = 'month' | 'year'
type PlanPrice = PlanPricing['plans'][PlanId]

const GB = 1024 ** 3
const PLAN_ORDER: PlanId[] = ['basic', 'pro', 'business']
// Drop a trailing `.00` so whole-dollar prices read as "$9" not "$9.00".
const TRAILING_ZEROS = /\.00$/

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
  return `${customDomains} custom domains`
}

// Effective per-month dollars for the chosen interval. Annual shows the amortized
// monthly figure (annual total / 12) so the toggle reads as a discount, not a
// bigger number. Sourced from live Polar prices (or the catalog fallback), so the
// displayed price always matches the real charge.
function perMonthUsd(price: PlanPrice, interval: Interval): number {
  const cents =
    interval === 'year' ? price.year.amountCents / 12 : price.month.amountCents
  return cents / 100
}

function formatUsd(dollars: number): string {
  return dollars.toFixed(2).replace(TRAILING_ZEROS, '')
}

function planFeatures(plan: Plan): string[] {
  const projects =
    plan.maxProjects === null
      ? 'Unlimited projects'
      : `${plan.maxProjects} projects`
  const features = [
    `${formatBandwidth(plan.includedBandwidthBytes)} delivered / mo`,
    `$${(plan.overagePerGbCents / 100).toFixed(2)}/GB overage`,
    plan.advancedAnalytics ? 'Advanced analytics' : 'Core analytics',
    plan.advancedLogs ? 'Full log history + search' : 'Recent logs (last 200)',
    projects,
    `${plan.maxSeats} team seats`,
  ]
  // Custom domains + AI tools are on the roadmap but not shipped yet, so mark
  // them "coming soon" rather than promising them at checkout.
  if (plan.customDomains === null || plan.customDomains > 0) {
    features.push(`${formatDomains(plan.customDomains)} (coming soon)`)
  }
  if (plan.aiCreditsPerMonth > 0) {
    features.push(`${plan.aiCreditsPerMonth} AI credits / mo (coming soon)`)
  }
  return features
}

function checkoutLabel(
  isCurrent: boolean,
  busy: boolean,
  hasPlan: boolean,
  planName: string,
): string {
  if (isCurrent) {
    return 'Current plan'
  }
  if (busy) {
    return 'Redirecting…'
  }
  // First subscription starts with the free trial; switches are immediate.
  return hasPlan
    ? `Switch to ${planName}`
    : `Start ${TRIAL.days}-day free trial`
}

// The interval toggle + the three plan cards, with checkout wired to Polar. Shared
// by the billing settings panel and the onboarding "choose a plan" dialog so the
// pricing UI and checkout logic never diverge. Checkout attributes the
// subscription to `orgId` server-side (the checkout guard rejects a foreign org).
export function PlanSelection({
  orgId,
  activePlanId,
  hasPlan = false,
  compact = false,
  usage,
}: {
  orgId: string
  activePlanId?: PlanId | null
  hasPlan?: boolean
  compact?: boolean
  // Current project/seat counts, so a downgrade can warn when they exceed the
  // target plan's caps. Omitted on the onboarding (no-plan) path.
  usage?: { projects: number; seats: number }
}) {
  const [interval, setInterval] = useState<Interval>('month')
  const [busy, setBusy] = useState<PlanId | null>(null)
  const [confirmPlan, setConfirmPlan] = useState<PlanId | null>(null)
  // Live Polar prices so the cards match the real charge; the catalog is the
  // first-paint/self-host/offline fallback so a price never renders blank.
  const { data: pricingData } = useQuery({
    queryKey: ['plan-pricing'],
    queryFn: () => getPlanPricingFn(),
    staleTime: 10 * 60 * 1000,
  })
  const pricing = pricingData ?? catalogPricing()

  async function startCheckout(planId: PlanId) {
    setBusy(planId)
    try {
      const result = await authClient.checkout({
        slug: `${planId}-${interval}`,
        referenceId: orgId,
      })
      const url = result?.data?.url
      if (url) {
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

  const targetPlan = confirmPlan ? PLANS[confirmPlan] : null
  const downgradeWarnings: string[] = []
  if (targetPlan && usage) {
    if (
      targetPlan.maxProjects !== null &&
      usage.projects > targetPlan.maxProjects
    ) {
      downgradeWarnings.push(
        `${usage.projects} projects (this plan includes ${targetPlan.maxProjects})`,
      )
    }
    if (usage.seats > targetPlan.maxSeats) {
      downgradeWarnings.push(
        `${usage.seats} seats (this plan includes ${targetPlan.maxSeats})`,
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1 sm:w-fit">
        {(['month', 'year'] as const).map((value) => (
          <button
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-1.5 font-medium text-sm transition-colors',
              interval === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            key={value}
            onClick={() => setInterval(value)}
            type="button"
          >
            {value === 'month' ? 'Monthly' : 'Annual'}
            {value === 'year' ? (
              <Badge variant="success">2 months free</Badge>
            ) : null}
          </button>
        ))}
      </div>

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
                    ${formatUsd(perMonthUsd(price, interval))}
                  </span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                {interval === 'year' ? (
                  <CardDescription>
                    Billed ${formatUsd(price.year.amountCents / 100)}/year
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {compact ? null : (
                  <ul className="flex flex-col gap-2 text-sm">
                    {planFeatures(plan).map((feature) => (
                      <li className="flex items-start gap-2" key={feature}>
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  className="mt-auto"
                  disabled={isCurrent || busy === planId}
                  onClick={() => {
                    // Confirm a switch for an existing subscriber; go straight to
                    // checkout on the first (no-plan) subscribe.
                    if (hasPlan) {
                      setConfirmPlan(planId)
                    } else {
                      startCheckout(planId)
                    }
                  }}
                  variant={highlight ? 'default' : 'outline'}
                >
                  {checkoutLabel(
                    isCurrent,
                    busy === planId,
                    hasPlan,
                    plan.name,
                  )}
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

      <Dialog
        onOpenChange={(next) => {
          if (!next) {
            setConfirmPlan(null)
          }
        }}
        open={confirmPlan !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to {targetPlan?.name}?</DialogTitle>
            <DialogDescription>
              You’ll continue to checkout to move to the {targetPlan?.name}{' '}
              plan. The change takes effect immediately and billing is prorated.
            </DialogDescription>
          </DialogHeader>
          {downgradeWarnings.length > 0 ? (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-text">
              You currently have {downgradeWarnings.join(' and ')}. Existing
              ones keep working, but you won’t be able to add more until you’re
              under the new limits.
            </div>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() => setConfirmPlan(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={busy !== null}
              onClick={() => {
                if (confirmPlan) {
                  startCheckout(confirmPlan)
                }
              }}
            >
              {busy ? 'Redirecting…' : 'Continue to checkout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
