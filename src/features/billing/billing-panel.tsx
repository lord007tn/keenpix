import { useQuery } from '@tanstack/react-query'
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
import { getBillingStateFn } from '@/functions/billing'
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
                {data.currentPeriodEnd ? (
                  <span className="text-muted-foreground text-sm">
                    {isEntitled ? 'Renews' : 'Ends'}{' '}
                    {new Date(data.currentPeriodEnd).toLocaleDateString()}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground text-sm">
                Free while you evaluate — no card required to explore the app.
              </span>
            )}
          </div>
          {canManageBilling ? (
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

      {!internalPlan && data?.orgId ? (
        <PlanSelection
          activePlanId={isEntitled ? activePlan : null}
          hasPlan={Boolean(activePlan)}
          orgId={data.orgId}
        />
      ) : null}
    </div>
  )
}
