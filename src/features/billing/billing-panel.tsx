import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
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
import { Progress } from '@/components/ui/progress'
import { getErrorMessage } from '@/errors/common'
import { PlanSelection } from '@/features/billing/plan-selection'
import {
  createBillingPortalSessionFn,
  createCustomDomainAddonCheckoutFn,
  getBillingStateFn,
} from '@/functions/billing'
import { TRIAL } from '@/lib/billing/plans'
import { humanBytes } from '@/shared/format'

type BillingData = Awaited<ReturnType<typeof getBillingStateFn>>

const PAYMENT_ISSUE = new Set(['past_due', 'unpaid'])

function currentPlanBlurb(planName: string | null | undefined): string {
  if (planName) {
    return `You're on the ${planName} plan.`
  }
  return 'No active subscription. Choose a plan to start.'
}

function DomainAddonCard({
  canManage,
  data,
  onManage,
}: {
  canManage: boolean
  data: BillingData
  onManage: () => void
}) {
  const addon = data.domainAddon
  const mutation = useMutation({
    mutationFn: () => createCustomDomainAddonCheckoutFn(),
    onSuccess: ({ url }) => {
      window.location.href = url
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not start add-on checkout')),
  })
  const active = addon.units > 0
  let description = 'Available after the Business trial converts to paid.'
  if (addon.canPurchase) {
    description = 'Add five domains without changing your plan.'
  }
  if (addon.status) {
    description = `Add-on status: ${addon.status}`
  }
  if (active) {
    description = 'Your workspace can connect up to 15 custom domains.'
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom-domain pack</CardTitle>
        <CardDescription>
          Business includes 10 custom domains. Add five more for $
          {addon.priceMonthlyUsd}/month.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {active ? (
            <Badge variant="success">+{addon.units} active</Badge>
          ) : null}
          <span className="text-muted-foreground">{description}</span>
        </div>
        {canManage && active ? (
          <Button onClick={onManage} variant="outline">
            Manage add-on
          </Button>
        ) : null}
        {canManage && addon.canPurchase ? (
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Opening checkout…' : 'Add 5 domains · $5/mo'}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

// What the period-end date means: expiry for a canceling/lapsed subscription,
// the first charge for a trial, a renewal otherwise.
function periodEndLabel(
  onTrial: boolean,
  isEntitled: boolean,
  scheduledToCancel: boolean,
): string {
  if (scheduledToCancel) {
    return 'Ends'
  }
  if (onTrial) {
    return 'Trial ends'
  }
  return isEntitled ? 'Renews' : 'Ends'
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
  const complimentary = data.billingSource === 'admin_grant'
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
          Since {dayjs(usage.periodStart).format('MMM D, YYYY')}
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
              {humanBytes(usage.overageBytes)} over your allowance
              {complimentary
                ? ' — complimentary access remains $0 and is never billed.'
                : ` — about $${(usage.overageCostCents / 100).toFixed(2)} in overage so far this period.`}
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
          <QuotaRow
            label="Projects"
            limit={usage.projects.limit}
            used={usage.projects.used}
          />
        ) : null}
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
      const { url } = await createBillingPortalSessionFn()
      if (url) {
        window.location.href = url
        return
      }
      throw new Error('Could not open billing portal')
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
  const complimentaryPlan = data?.billingSource === 'admin_grant'
  const isEntitled = data?.status === 'active' || data?.status === 'trialing'
  const paymentIssue = data ? PAYMENT_ISSUE.has(data.status ?? '') : false
  const canManageBilling = Boolean(data?.hasBillingCustomer)
  const canManage = data?.canManage ?? false
  // Set to cancel at period end: still active/serving until currentPeriodEnd, but
  // won't renew — so the period-end date is an expiry, not a renewal.
  const scheduledToCancel = Boolean(data?.cancelAtPeriodEnd)
  const onTrial = data?.status === 'trialing'
  const periodEndDate = data?.currentPeriodEnd
    ? dayjs(data.currentPeriodEnd).format('MMM D, YYYY')
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

      {onTrial && !scheduledToCancel ? (
        <Alert>
          <AlertTitle>You’re on a free trial</AlertTitle>
          <AlertDescription>
            Trial usage is free — up to {humanBytes(TRIAL.bandwidthBytes)}{' '}
            delivered and {TRIAL.maxProjects} projects.{' '}
            {periodEndDate
              ? `Your first charge happens on ${periodEndDate}`
              : 'Your first charge happens when the trial ends'}
            ; cancel anytime before then from Manage billing.
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
                  {complimentaryPlan ? 'complimentary access' : data.status}
                </Badge>
                {periodEndDate ? (
                  <span className="text-muted-foreground text-sm">
                    {periodEndLabel(onTrial, isEntitled, scheduledToCancel)}{' '}
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
          {canManage && canManageBilling && !complimentaryPlan ? (
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

      {data && !complimentaryPlan && activePlan === 'business' ? (
        <DomainAddonCard
          canManage={canManage}
          data={data}
          onManage={openPortal}
        />
      ) : null}

      {complimentaryPlan ? (
        <Card>
          <CardHeader>
            <CardTitle>Checkout disabled</CardTitle>
            <CardDescription>
              This workspace has complimentary admin-granted access. It has $0
              revenue and does not create invoices or change Polar records.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!complimentaryPlan && data?.orgId && canManage ? (
        <PlanSelection
          activePlanId={isEntitled ? activePlan : null}
          hasPlan={Boolean(activePlan)}
          orgId={data.orgId}
        />
      ) : null}
      {!complimentaryPlan && data?.orgId && !canManage ? (
        <p className="text-muted-foreground text-sm">
          Billing is managed by your organization’s owners and admins.
        </p>
      ) : null}
    </div>
  )
}
