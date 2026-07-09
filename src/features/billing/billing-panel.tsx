import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TriangleAlertIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { getErrorMessage } from '@/errors/common'
import { PlanSelection } from '@/features/billing/plan-selection'
import { getBillingStateFn, setSpendCapFn } from '@/functions/billing'
import { authClient } from '@/lib/auth/client'
import { humanBytes } from '@/shared/format'

type BillingData = Awaited<ReturnType<typeof getBillingStateFn>>

const PAYMENT_ISSUE = new Set(['past_due', 'unpaid'])

function currentPlanBlurb(planName: string | null | undefined): string {
  if (planName) {
    return `You're on the ${planName} plan.`
  }
  return 'No active subscription. Choose a plan to start.'
}

function QuotaRow({
  label,
  limit,
  used,
}: {
  label: string
  limit: number | null
  used: number
}) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {limit === null ? `${used} · Unlimited` : `${used} of ${limit}`}
        </span>
      </div>
      {limit === null ? null : <Progress value={pct} />}
    </div>
  )
}

// Usage this billing period: the metered bandwidth (with overage projection) plus
// the plan-limited resource counts. Bandwidth is what Polar bills, so this is the
// "no surprise bill" surface.
function UsageCard({ data }: { data: BillingData }) {
  const { usage } = data
  const hasPlan = data.plan !== null
  const over = usage.overageBytes > 0
  const pct =
    usage.includedBytes && usage.includedBytes > 0
      ? Math.min(100, (usage.bandwidthBytes / usage.includedBytes) * 100)
      : 0
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage this period</CardTitle>
        <CardDescription>
          Since {new Date(usage.periodStart).toLocaleDateString()}
          {hasPlan ? '' : ' · this month'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Bandwidth delivered</span>
            <span
              className={over ? 'text-destructive' : 'text-muted-foreground'}
            >
              {humanBytes(usage.bandwidthBytes)}
              {usage.includedBytes === null
                ? ''
                : ` of ${humanBytes(usage.includedBytes)}`}
            </span>
          </div>
          {usage.includedBytes === null ? null : <Progress value={pct} />}
          {over ? (
            <p className="text-destructive text-xs">
              {humanBytes(usage.overageBytes)} over your allowance — about $
              {(usage.overageCostCents / 100).toFixed(2)} in overage so far this
              period.
            </p>
          ) : null}
          {!over && usage.includedBytes && pct >= 80 ? (
            <p className="text-warning-text text-xs">
              You’ve used {pct.toFixed(0)}% of your included bandwidth this
              period.
            </p>
          ) : null}
        </div>
        {hasPlan ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <QuotaRow
              label="Projects"
              limit={usage.projects.limit}
              used={usage.projects.used}
            />
            <QuotaRow
              label="Team seats"
              limit={usage.seats.limit}
              used={usage.seats.used}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

// Hard spending cap on overage: the customer sets a dollar ceiling and serving
// stops once accrued overage reaches it (enforced by the serving gate). Delivers
// the "no surprise bill" promise. Owner/admin-only; members see it read-only.
function SpendCapCard({
  canManage,
  data,
}: {
  canManage: boolean
  data: BillingData
}) {
  const queryClient = useQueryClient()
  const cap = data.spendCapCents
  const [value, setValue] = useState('')
  const mutation = useMutation({
    mutationFn: (spendCapCents: number | null) =>
      setSpendCapFn({ data: { spendCapCents } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-state'] })
      setValue('')
      toast.success('Spending cap updated')
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not update the cap')),
  })
  const overageDollars = (data.usage.overageCostCents / 100).toFixed(2)

  function save() {
    const dollars = Number.parseFloat(value)
    if (Number.isNaN(dollars) || dollars < 0) {
      toast.error('Enter a cap in dollars (0 or more)')
      return
    }
    mutation.mutate(Math.round(dollars * 100))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending cap</CardTitle>
        <CardDescription>
          Stop serving images once overage charges this period reach your cap,
          so a traffic spike or hotlink can never run up an unbounded bill.
          Enforced within about an hour.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          {cap === null
            ? 'No cap set — overage is unlimited at your plan rate.'
            : `Cap: $${(cap / 100).toFixed(2)} of overage · $${overageDollars} used so far this period.`}
        </p>
        {canManage ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="spend-cap">Overage cap (USD)</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">$</span>
                <Input
                  className="w-32"
                  id="spend-cap"
                  inputMode="decimal"
                  min={0}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={cap === null ? '50.00' : (cap / 100).toFixed(2)}
                  type="number"
                  value={value}
                />
              </div>
            </div>
            <Button
              disabled={mutation.isPending || value.trim() === ''}
              onClick={save}
            >
              {mutation.isPending ? 'Saving…' : 'Set cap'}
            </Button>
            {cap === null ? null : (
              <Button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(null)}
                variant="outline"
              >
                Remove cap
              </Button>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Only owners and admins can change the spending cap.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Cloud billing surface: current subscription summary + usage meter + the plan
// grid (shared PlanSelection). Checkout and the customer portal go through the
// Polar-backed auth client, whose server endpoints only exist in cloud. Self-host
// never renders this (the settings section is cloud-gated).
export function BillingPanel() {
  const [portalBusy, setPortalBusy] = useState(false)
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['billing-state'],
    queryFn: () => getBillingStateFn(),
    staleTime: 30_000,
  })

  async function openPortal() {
    setPortalBusy(true)
    try {
      const result = await authClient.customer.portal()
      const url = result?.data?.url
      if (url) {
        window.location.href = url
        return
      }
      if (result?.error) {
        throw new Error(result.error.message ?? 'Could not open billing portal')
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
      setPortalBusy(false)
    }
  }

  // A failed fetch must never silently read as "unsubscribed" — that would hide
  // a paying user's plan and the portal button. Show an explicit error + retry.
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>
            We couldn’t load your billing details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} variant="outline">
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const activePlan = data?.plan ?? null
  const internalPlan = data?.planSource === 'internal'
  const isEntitled =
    data?.status === 'active' || data?.status === 'trialing' || internalPlan
  const paymentIssue = data ? PAYMENT_ISSUE.has(data.status ?? '') : false
  const canManageBilling = Boolean(data?.hasBillingCustomer)
  const canManage = data?.canManage ?? false
  const cap = data?.spendCapCents ?? null
  const overageCents = data?.usage.overageCostCents ?? 0
  const capReached = cap !== null && overageCents >= cap
  const capNear = cap !== null && !capReached && overageCents >= cap * 0.8
  const capDollars = cap === null ? '' : (cap / 100).toFixed(2)
  // Set to cancel at period end: still active/serving until currentPeriodEnd, but
  // won't renew — so the period-end date is an expiry, not a renewal.
  const scheduledToCancel = Boolean(data?.cancelAtPeriodEnd)
  const periodEndDate = data?.currentPeriodEnd
    ? new Date(data.currentPeriodEnd).toLocaleDateString()
    : null

  return (
    <div className="flex flex-col gap-6">
      {paymentIssue ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Your last payment didn’t go through</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            Image delivery continues for now, but will stop if billing isn’t
            brought current. Update your payment method to avoid interruption.
            <Button
              disabled={portalBusy}
              onClick={openPortal}
              size="sm"
              variant="outline"
            >
              {portalBusy ? 'Opening…' : 'Update payment method'}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {capReached ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Image delivery paused — spending cap reached</AlertTitle>
          <AlertDescription>
            You’ve reached your ${capDollars} overage cap for this period, so
            images are no longer being served. Raise or remove the cap below to
            resume delivery.
          </AlertDescription>
        </Alert>
      ) : null}
      {capNear ? (
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>Approaching your spending cap</AlertTitle>
          <AlertDescription>
            You’ve used ${(overageCents / 100).toFixed(2)} of your ${capDollars}{' '}
            overage cap this period. Delivery pauses when you reach it.
          </AlertDescription>
        </Alert>
      ) : null}
      {scheduledToCancel ? (
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>Your plan is scheduled to cancel</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            {periodEndDate
              ? `You’ll keep full access until ${periodEndDate}, then your subscription ends and won’t renew.`
              : 'Your subscription won’t renew and ends at the close of the current period.'}
            {canManage && canManageBilling ? (
              <Button disabled={portalBusy} onClick={openPortal} size="sm">
                {portalBusy ? 'Opening…' : 'Resume plan'}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            {isPending
              ? 'Loading your subscription…'
              : currentPlanBlurb(activePlan ? data?.planName : null)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {data?.status ? (
              <>
                <Badge variant={isEntitled ? 'success' : 'warning'}>
                  {internalPlan ? 'internal grant' : data.status}
                </Badge>
                {periodEndDate ? (
                  <span className="text-muted-foreground text-sm">
                    {isEntitled && !scheduledToCancel ? 'Renews' : 'Ends'}{' '}
                    {periodEndDate}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground text-sm">
                No active subscription. Choose a plan below to create a project
                and start delivering images.
              </span>
            )}
          </div>
          {canManage && canManageBilling ? (
            <Button
              disabled={portalBusy}
              onClick={openPortal}
              variant="outline"
            >
              {portalBusy ? 'Opening…' : 'Manage billing'}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {data ? <UsageCard data={data} /> : null}

      {data && !internalPlan && activePlan ? (
        <SpendCapCard canManage={canManage} data={data} />
      ) : null}

      {internalPlan ? (
        <Card>
          <CardHeader>
            <CardTitle>Checkout disabled</CardTitle>
            <CardDescription>
              This workspace has an internal admin-granted plan. It does not
              create invoices or change billing records.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!internalPlan && data?.orgId && canManage ? (
        <PlanSelection
          activePlanId={isEntitled ? activePlan : null}
          hasPlan={Boolean(activePlan)}
          orgId={data.orgId}
          usage={{
            projects: data.usage.projects.used,
            seats: data.usage.seats.used,
          }}
        />
      ) : null}
      {!internalPlan && data?.orgId && !canManage ? (
        <p className="text-muted-foreground text-sm">
          Billing is managed by your organization’s owners and admins.
        </p>
      ) : null}
    </div>
  )
}
