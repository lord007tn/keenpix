import { useQuery } from '@tanstack/react-query'
import { CheckCircle2Icon, CircleIcon, LockIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { CodeBlock } from '@/components/app/code-block'
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
import { cn } from '@/lib/cn/utils'

// Pick a plan and check out inline, without leaving onboarding. Checkout attributes
// the subscription to the caller's org server-side.
function ChoosePlanDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button size="sm" />}>Choose a plan</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose your plan</DialogTitle>
          <DialogDescription>
            Every plan bills on bandwidth delivered — never per transform.
            Unlimited transforms, two months free on annual.
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
  hasProjects,
}: {
  cloud: boolean
  hasProjects: boolean
}) {
  const { data } = useQuery({
    queryKey: ['billing-state'],
    queryFn: () => getBillingStateFn(),
    enabled: cloud,
    staleTime: 30_000,
  })
  const subscribed =
    !cloud || data?.status === 'active' || data?.status === 'trialing'

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
              action={
                data?.orgId ? <ChoosePlanDialog orgId={data.orgId} /> : null
              }
              description="Cloud plans start at $9/mo for 100 GB delivered, with unlimited transforms."
              done={subscribed}
              title="Choose a plan"
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
            locked={!hasProjects}
            title="Make your first request"
          />
        </CardContent>
      </Card>
      {hasProjects ? (
        <Card>
          <CardHeader>
            <CardTitle>Your transform URL</CardTitle>
            <CardDescription>
              Swap in your project id and an allowlisted source image.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock>{`<img
  src="https://keenpix.com/img/https://cdn.example.com/hero.jpg?project=<id>&w=1200&fmt=webp&q=82"
  width="1200" height="800" alt="Hero" />`}</CodeBlock>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
