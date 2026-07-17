import { AlertTriangleIcon, CheckIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getErrorMessage } from '@/errors/common'
import {
  type getCustomerAccountsFn,
  updateComplimentaryPlanFn,
} from '@/functions/admin'
import { getPlan, PLANS, type PlanId } from '@/lib/billing/plans'
import { cn } from '@/lib/cn/utils'
import { compactNumber, humanBytes } from '@/shared/format'

type CustomerAccount = Awaited<ReturnType<typeof getCustomerAccountsFn>>[number]
type GrantPlan = 'free' | PlanId

const PLAN_OPTIONS: GrantPlan[] = ['free', 'basic', 'pro', 'business']

function currentGrantPlan(customer: CustomerAccount): GrantPlan {
  const plan =
    customer.billing.source === 'admin_grant' ? customer.billing.plan : null
  return plan === 'basic' || plan === 'pro' || plan === 'business'
    ? plan
    : 'free'
}

function projectsLabel(max: number | null) {
  return max === null ? 'Unlimited projects' : `${max} projects`
}

// Complimentary access is a local subscription snapshot with no Polar id and
// zero revenue. Provider-managed rows are read-only in the operator console.
export function PlanChange({
  customer,
  onSaved,
}: {
  customer: CustomerAccount
  onSaved: () => void
}) {
  const initialPlan = currentGrantPlan(customer)
  const [selected, setSelected] = useState<GrantPlan>(initialPlan)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const providerManaged = customer.billing.source === 'polar'
  const changed = selected !== initialPlan

  const target = getPlan(selected)
  const usage = customer.usage30d
  const bandwidthPct =
    target && target.includedBandwidthBytes > 0
      ? Math.round((usage.bandwidthBytes / target.includedBandwidthBytes) * 100)
      : null
  const warnings: string[] = []
  if (target) {
    if (target.maxProjects !== null && customer.projects > target.maxProjects) {
      warnings.push(
        `${customer.name} has ${customer.projects} projects but ${target.name} allows ${target.maxProjects}. Existing projects keep working; no new ones can be added.`,
      )
    }
    if (customer.seats > target.maxSeats) {
      warnings.push(
        `${customer.name} has ${customer.seats} seats but ${target.name} allows ${target.maxSeats}. Existing members keep access; no new ones can be added.`,
      )
    }
    if (bandwidthPct !== null && bandwidthPct >= 100) {
      warnings.push(
        `30-day bandwidth is already ${bandwidthPct}% of the ${target.name} allowance. Complimentary access remains $0 and is never billed.`,
      )
    }
  }

  async function save() {
    setSaving(true)
    try {
      await updateComplimentaryPlanFn({
        data: {
          orgId: customer.id,
          plan: selected,
        },
      })
      toast.success(
        selected === 'free'
          ? 'Complimentary access removed'
          : `Complimentary ${target?.name} access granted`,
      )
      setConfirmOpen(false)
      onSaved()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update complimentary plan'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_OPTIONS.map((option) => {
          const plan = option === 'free' ? null : PLANS[option]
          const active = selected === option
          return (
            <button
              className={cn(
                'flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors',
                active
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-ring/60 hover:bg-accent',
              )}
              disabled={providerManaged}
              key={option}
              onClick={() => setSelected(option)}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">
                  {plan ? plan.name : 'Free'}
                </span>
                {active ? <CheckIcon className="size-4 text-primary" /> : null}
              </div>
              {plan ? (
                <div className="flex flex-col gap-0.5 text-muted-foreground text-xs">
                  <span>
                    $0 complimentary · ${plan.priceMonthlyUsd}/mo list
                  </span>
                  <span>
                    {humanBytes(plan.includedBandwidthBytes)} bandwidth
                  </span>
                  <span>{projectsLabel(plan.maxProjects)}</span>
                  <span>{plan.maxSeats} seats</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">
                  Remove complimentary access.
                </span>
              )}
            </button>
          )
        })}
      </div>

      {providerManaged ? (
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning-text" />
          <span>
            This subscription is managed by Polar. Change or cancel it in Polar;
            local admin actions are disabled.
          </span>
        </div>
      ) : null}

      {target ? (
        <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
          <span className="font-medium text-sm">Effect preview</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
            <span>
              Bandwidth: {humanBytes(usage.bandwidthBytes)} used of{' '}
              {humanBytes(target.includedBandwidthBytes)}
              {bandwidthPct === null ? '' : ` (${bandwidthPct}%)`}
            </span>
            <span>Requests 30d: {compactNumber(usage.requests)}</span>
            <span>
              Projects: {customer.projects}/
              {target.maxProjects === null ? '∞' : target.maxProjects}
            </span>
            <span>
              Seats: {customer.seats}/{target.maxSeats}
            </span>
          </div>
          {warnings.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {warnings.map((warning) => (
                <li
                  className="flex items-start gap-1.5 text-warning-text text-xs"
                  key={warning}
                >
                  <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs">
          Complimentary access:{' '}
          {customer.billing.source === 'admin_grant' ? (
            <Badge variant="info">{customer.billing.planName}</Badge>
          ) : (
            'Free'
          )}
        </span>
        <Button
          disabled={!changed || saving || providerManaged}
          onClick={() => setConfirmOpen(true)}
          size="sm"
        >
          {selected === 'free' ? 'Select Free' : 'Review & apply'}
        </Button>
      </div>

      <Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected === 'free'
                ? 'Remove complimentary access?'
                : `Grant ${customer.name} complimentary ${target?.name}?`}
            </DialogTitle>
            <DialogDescription>
              {selected === 'free'
                ? `${customer.name} will return to Free with no paid-plan entitlement. Takes effect immediately.`
                : `Grants ${target?.name} locally for free with $0 revenue. No Polar customer, subscription, invoice, or charge is created or changed.`}
            </DialogDescription>
          </DialogHeader>
          {warnings.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {warnings.map((warning) => (
                <li
                  className="flex items-start gap-1.5 text-warning-text text-xs"
                  key={warning}
                >
                  <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() => setConfirmOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={saving} onClick={save}>
              {saving ? 'Applying…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
