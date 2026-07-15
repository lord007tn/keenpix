import dayjs from 'dayjs'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/errors/common'
import {
  type getCustomerAccountsFn,
  updateInternalPlanGrantFn,
} from '@/functions/admin'
import { getPlan, PLANS, type PlanId } from '@/lib/billing/plans'
import { cn } from '@/lib/cn/utils'
import { compactNumber, humanBytes } from '@/shared/format'

type CustomerAccount = Awaited<ReturnType<typeof getCustomerAccountsFn>>[number]
type GrantPlan = 'none' | PlanId

const PLAN_OPTIONS: GrantPlan[] = ['none', 'basic', 'pro', 'business']

function currentGrantPlan(customer: CustomerAccount): GrantPlan {
  const plan = customer.internalGrant?.active
    ? customer.internalGrant.plan
    : null
  return plan === 'basic' || plan === 'pro' || plan === 'business'
    ? plan
    : 'none'
}

function projectsLabel(max: number | null) {
  return max === null ? 'Unlimited projects' : `${max} projects`
}

// Operator internal-plan-grant editor. Distinct from the customer's Polar
// subscription: a grant is a free override that wins over billing only when it
// out-ranks the entitled billing plan. Shown as selectable plan cards with an
// effect preview against the customer's live usage, then a confirm step.
export function PlanChange({
  customer,
  onSaved,
}: {
  customer: CustomerAccount
  onSaved: () => void
}) {
  // Only seed reason/expiry from an ACTIVE grant. An expired grant reports
  // active:false (and currentGrantPlan → 'none'), so pre-filling its stale past
  // expiry would silently re-submit a date in the past and write a dead grant.
  const activeGrant = customer.internalGrant?.active
    ? customer.internalGrant
    : null
  const initialPlan = currentGrantPlan(customer)
  const initialReason = activeGrant?.reason ?? ''
  const initialExpiry = activeGrant?.expiresAt?.slice(0, 10) ?? ''
  const [selected, setSelected] = useState<GrantPlan>(initialPlan)
  const [reason, setReason] = useState(initialReason)
  const [expiresAt, setExpiresAt] = useState(initialExpiry)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const changed =
    selected === 'none'
      ? initialPlan !== 'none'
      : selected !== initialPlan ||
        reason !== initialReason ||
        expiresAt !== initialExpiry

  const target = getPlan(selected)
  const usage = customer.usage30d
  const bandwidthPct =
    target && target.includedBandwidthBytes > 0
      ? Math.round((usage.bandwidthBytes / target.includedBandwidthBytes) * 100)
      : null
  // A past expiry on a real plan would write an immediately-inactive grant —
  // block it (the native input min= is only cosmetic against typed/stale values).
  const expiryInPast =
    selected !== 'none' &&
    Boolean(expiresAt) &&
    !dayjs(expiresAt).endOf('day').isAfter(dayjs())
  const warnings: string[] = []
  if (target) {
    if (expiryInPast) {
      warnings.push(
        'The expiry date is in the past — this grant would be inactive immediately. Clear it or pick a future date.',
      )
    }
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
        `30-day bandwidth is already ${bandwidthPct}% of the ${target.name} allowance — expect overage.`,
      )
    }
  }

  async function save() {
    setSaving(true)
    try {
      await updateInternalPlanGrantFn({
        data: {
          orgId: customer.id,
          plan: selected,
          reason: reason.trim() || undefined,
          expiresAt: expiresAt || undefined,
        },
      })
      toast.success(
        selected === 'none'
          ? 'Internal grant removed'
          : `Internal plan set to ${target?.name}`,
      )
      setConfirmOpen(false)
      onSaved()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update internal plan'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_OPTIONS.map((option) => {
          const plan = option === 'none' ? null : PLANS[option]
          const active = selected === option
          return (
            <button
              className={cn(
                'flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors',
                active
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-ring/60 hover:bg-accent',
              )}
              key={option}
              onClick={() => setSelected(option)}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">
                  {plan ? plan.name : 'No plan'}
                </span>
                {active ? <CheckIcon className="size-4 text-primary" /> : null}
              </div>
              {plan ? (
                <div className="flex flex-col gap-0.5 text-muted-foreground text-xs">
                  <span>${plan.priceMonthlyUsd}/mo value</span>
                  <span>
                    {humanBytes(plan.includedBandwidthBytes)} bandwidth
                  </span>
                  <span>{projectsLabel(plan.maxProjects)}</span>
                  <span>{plan.maxSeats} seats</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">
                  Remove the operator grant. Billing applies if active.
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grant-reason">Reason (internal)</Label>
          <Input
            disabled={selected === 'none'}
            id="grant-reason"
            onChange={(event) => setReason(event.target.value)}
            placeholder="Partner account, trial extension…"
            value={reason}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grant-expiry">Expiry (optional)</Label>
          <Input
            disabled={selected === 'none'}
            id="grant-expiry"
            min={dayjs().format('YYYY-MM-DD')}
            onChange={(event) => setExpiresAt(event.target.value)}
            type="date"
            value={expiresAt}
          />
        </div>
      </div>

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
          Current grant:{' '}
          {customer.internalGrant?.active ? (
            <Badge variant="info">{customer.internalGrant.planName}</Badge>
          ) : (
            'none'
          )}
        </span>
        <Button
          disabled={!changed || saving || expiryInPast}
          onClick={() => setConfirmOpen(true)}
          size="sm"
        >
          {selected === 'none' ? 'Remove grant' : 'Review & apply'}
        </Button>
      </div>

      <Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected === 'none'
                ? 'Remove internal plan grant?'
                : `Set ${customer.name} to ${target?.name}?`}
            </DialogTitle>
            <DialogDescription>
              {selected === 'none'
                ? `${customer.name} falls back to its billing subscription (or no plan). Takes effect immediately.`
                : `Grants ${target?.name} for free, overriding billing when it out-ranks the paid plan. Takes effect immediately${expiresAt ? `, expiring ${dayjs(expiresAt).format('MMM D, YYYY')}` : ''}.`}
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
