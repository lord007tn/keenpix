import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CheckCircle2Icon, CircleIcon, LockIcon } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PlanSelection } from '@/features/billing/plan-selection'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import { getBillingStateFn } from '@/functions/billing'
import { trackFunnelMilestone } from '@/lib/analytics/client'
import { PLANS, TRIAL } from '@/lib/billing/plans'
import { cn } from '@/lib/cn/utils'

// Pick a plan and check out inline, without leaving onboarding. Checkout attributes
// the subscription to the caller's org server-side.
function ChoosePlanDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button size="sm" />}>
        Start your free trial
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose your plan</DialogTitle>
          <DialogDescription>
            Every plan starts with a {TRIAL.days}-day free trial and bills on
            application response bytes — never per transform. Unlimited
            transforms on every monthly plan.
          </DialogDescription>
        </DialogHeader>
        <PlanSelection orgId={orgId} />
      </DialogContent>
    </Dialog>
  )
}

function stepIcon(done: boolean, locked?: boolean) {
  if (done) {
    return CheckCircle2Icon
  }
  return locked ? LockIcon : CircleIcon
}

function stepIconClass(done: boolean, locked?: boolean) {
  if (done) {
    return 'text-primary'
  }
  return locked ? 'text-muted-foreground/60' : 'text-muted-foreground'
}

function Step({
  action,
  description,
  done,
  locked,
  title,
}: {
  action?: ReactNode
  description: string
  done: boolean
  locked?: boolean
  title: string
}) {
  const Icon = stepIcon(done, locked)
  return (
    <div className="flex gap-3 border-b py-4 last:border-0">
      <Icon
        className={cn('mt-0.5 size-5 shrink-0', stepIconClass(done, locked))}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col">
          <span
            className={cn(
              'font-medium',
              done && 'text-muted-foreground line-through',
            )}
          >
            {title}
          </span>
          <span className="text-muted-foreground text-sm">{description}</span>
        </div>
        {!(done || locked) && action ? <div>{action}</div> : null}
      </div>
    </div>
  )
}

// First-run guide shown when a workspace has no projects yet. Cloud has no free
// tier, so the funnel is: subscribe → create a project → make a request.
// Self-host skips the subscribe step (unlimited).
export function OnboardingChecklist({
  cloud,
  entitled,
  hasProjects,
  orgRole,
}: {
  cloud: boolean
  entitled?: boolean
  hasProjects: boolean
  orgRole?: string | null
}) {
  const { data, isError, isPending, refetch } = useQuery({
    queryKey: ['billing-state'],
    queryFn: () => getBillingStateFn(),
    enabled: cloud,
    staleTime: 30_000,
  })
  const subscribed =
    !cloud ||
    entitled === true ||
    data?.status === 'active' ||
    data?.status === 'trialing' ||
    data?.status === 'internal'
  const canManageBilling = !cloud || orgRole === 'owner' || orgRole === 'admin'
  const needsBillingRecovery =
    data?.status === 'past_due' ||
    data?.status === 'unpaid' ||
    data?.hasBillingCustomer === true

  useEffect(() => {
    if (data?.status === 'trialing') {
      trackFunnelMilestone('trial_started')
    } else if (data?.status === 'active') {
      trackFunnelMilestone('subscription_activated')
    }
  }, [data?.status])

  // The first step must never render action-less for a brand-new user: show a
  // loading placeholder while billing state resolves and a retry when it fails
  // — this is the exact moment churn is cheapest.
  let planAction: ReactNode = null
  if (data?.orgId && needsBillingRecovery && canManageBilling) {
    planAction = (
      <Button
        nativeButton={false}
        render={<Link search={{ section: 'billing' }} to="/app/settings" />}
        size="sm"
      >
        Review billing
      </Button>
    )
  } else if (data?.orgId && !canManageBilling) {
    planAction = (
      <span className="text-muted-foreground text-sm">
        Ask an organization owner or admin to activate the workspace.
      </span>
    )
  } else if (data?.orgId) {
    planAction = <ChoosePlanDialog orgId={data.orgId} />
  } else if (isError) {
    planAction = (
      <div className="flex items-center gap-2">
        <span className="text-destructive text-sm">
          Couldn’t load your billing details.
        </span>
        <Button onClick={() => refetch()} size="sm" variant="outline">
          Try again
        </Button>
      </div>
    )
  } else if (isPending) {
    planAction = (
      <Button disabled size="sm" variant="outline">
        Loading…
      </Button>
    )
  }

  let planDescription = `Every plan starts with a ${TRIAL.days}-day free trial — trial usage is never billed, and plans start at $${PLANS.basic.priceMonthlyUsd}/mo with unlimited transforms.`
  if (subscribed) {
    planDescription =
      'Your organization has access through an active plan or internal grant.'
  } else if (needsBillingRecovery) {
    planDescription =
      'Review the existing billing account to restore workspace access.'
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">
          Welcome to Keenpix
        </h1>
        <p className="text-muted-foreground">
          A few steps to start delivering optimized images.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Get started</CardTitle>
          <CardDescription>
            No SDK — once a project exists you optimize images with a URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {cloud ? (
            <Step
              action={planAction}
              description={planDescription}
              done={subscribed}
              title={
                needsBillingRecovery
                  ? 'Restore workspace access'
                  : 'Activate your workspace'
              }
            />
          ) : null}
          <Step
            action={<NewProjectDialog />}
            description="A project points Keenpix at one image origin you control."
            done={hasProjects}
            locked={cloud && !subscribed}
            title="Create your first project"
          />
          <Step
            description="Request /img/<source-url>?project=<id> — Keenpix fetches, optimizes, caches, and delivers it. No API key needed."
            done={false}
            locked={!hasProjects || (cloud && !subscribed)}
            title="Make your first request"
          />
        </CardContent>
      </Card>
    </div>
  )
}
