import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import dayjs from 'dayjs'
import {
  ArrowLeftIcon,
  BanIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  UserCogIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChartAreaInteractive } from '@/components/app/chart-area-interactive'
import { HistoryRangePicker } from '@/components/app/history-range-picker'
import { PageHeader } from '@/components/app/page-header'
import { RefreshingIndicator } from '@/components/app/refreshing-indicator'
import { StatCard } from '@/components/app/stat-card'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getErrorMessage } from '@/errors/common'
import { PlanChange } from '@/features/admin/plan-change'
import {
  getCustomerAccountFn,
  getCustomerAnalyticsFn,
  setOrgSuspensionFn,
} from '@/functions/admin'
import { limitHistorySearch } from '@/helpers/history/window'
import { authClient } from '@/lib/auth/client'
import { DEFAULT_HISTORY_DAYS } from '@/lib/billing/plans'
import { compactNumber, humanBytes } from '@/shared/format'

type CustomerAccount = NonNullable<
  Awaited<ReturnType<typeof getCustomerAccountFn>>
>
function planBadgeVariant(source: string | undefined) {
  if (source === 'internal') {
    return 'info' as const
  }
  if (source === 'billing') {
    return 'success' as const
  }
  return 'outline' as const
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

export function CustomerDetail({ orgId }: { orgId: string }) {
  const [customer, setCustomer] = useState<CustomerAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonating, setImpersonating] = useState(false)
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspending, setSuspending] = useState(false)
  const search = useSearch({ from: '/admin/customers/$orgId/' })
  const navigate = useNavigate({ from: '/admin/customers/$orgId/' })
  const selectedRange = search.range ?? '30d'
  const selectedSection = search.section ?? 'overview'
  const maxHistoryDays =
    customer?.effectivePlan?.historyDays ?? DEFAULT_HISTORY_DAYS
  const visibleSearch = limitHistorySearch(
    {
      from: search.from,
      range: selectedRange,
      to: search.to,
    },
    maxHistoryDays,
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setCustomer(await getCustomerAccountFn({ data: { orgId } }))
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load customer'))
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    load()
  }, [load])

  const analyticsQuery = useQuery({
    queryKey: [
      'admin-customer-analytics',
      orgId,
      visibleSearch.range,
      visibleSearch.from,
      visibleSearch.to,
      maxHistoryDays,
    ],
    queryFn: () =>
      getCustomerAnalyticsFn({
        data: {
          from: visibleSearch.from,
          orgId,
          range: visibleSearch.range,
          to: visibleSearch.to,
        },
      }),
    enabled: Boolean(customer),
    placeholderData: keepPreviousData,
  })
  const analytics = analyticsQuery.data

  const owner = customer?.owners[0]

  async function impersonate() {
    if (!owner) {
      return
    }
    setImpersonating(true)
    try {
      // better-auth's client returns { data, error } and does not throw.
      const impersonation = await authClient.admin.impersonateUser({
        userId: owner.id,
      })
      if (impersonation.error) {
        throw new Error(impersonation.error.message ?? 'Could not impersonate')
      }
      // Pin the org being inspected. better-auth's session-create hook otherwise
      // defaults the impersonated session's active org to the owner's *earliest*
      // membership, which for a multi-org owner is the wrong tenant. If pinning
      // fails, back the impersonation out so we never land in the wrong tenant.
      const pinned = await authClient.organization.setActive({
        organizationId: orgId,
      })
      if (pinned.error) {
        await authClient.admin.stopImpersonating()
        throw new Error(
          pinned.error.message ?? 'Could not switch to this organization',
        )
      }
      window.location.assign('/app')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not impersonate'))
      setImpersonating(false)
    }
  }

  async function handleSuspend() {
    if (!customer) {
      return
    }
    const suspended = Boolean(customer.suspendedAt)
    setSuspending(true)
    try {
      await setOrgSuspensionFn({
        data: {
          orgId: customer.id,
          suspended: !suspended,
          reason: suspendReason.trim() || undefined,
        },
      })
      toast.success(suspended ? 'Customer reactivated' : 'Customer suspended')
      setConfirmSuspend(false)
      setSuspendReason('')
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update suspension'))
    } finally {
      setSuspending(false)
    }
  }

  if (loading && !customer) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground text-sm">
        <Spinner /> Loading customer…
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          to="/admin/customers"
        >
          <ArrowLeftIcon className="size-4" />
          Back to customers
        </Link>
        <p className="text-muted-foreground text-sm">Customer not found.</p>
      </div>
    )
  }

  const suspended = Boolean(customer.suspendedAt)
  const suspendActionLabel = suspended ? 'Reactivate' : 'Suspend'
  const summary = analytics?.summary
  const windowLabel = analytics
    ? `${dayjs(`${analytics.window.from}T12:00:00`).format('MMM D, YYYY')} – ${dayjs(`${analytics.window.to}T12:00:00`).format('MMM D, YYYY')}`
    : 'Loading selected window…'
  let billingPeriodLabel = 'Ends'
  if (customer.billing.cancelAtPeriodEnd) {
    billingPeriodLabel = 'Ends'
  } else if (customer.billing.status === 'trialing') {
    billingPeriodLabel = 'Trial ends'
  } else if (customer.billing.status === 'active') {
    billingPeriodLabel = 'Renews'
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/admin/customers" />}>
                Customers
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{customer.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <PageHeader
          actions={
            <>
              <Button
                disabled={loading}
                onClick={load}
                size="sm"
                variant="outline"
              >
                <RefreshCcwIcon data-icon="inline-start" />
                Refresh
              </Button>
              <Button
                disabled={!owner || impersonating}
                onClick={impersonate}
                size="sm"
                variant="outline"
              >
                <UserCogIcon data-icon="inline-start" />
                {impersonating ? 'Starting…' : 'Impersonate'}
              </Button>
              <Button
                onClick={() => setConfirmSuspend(true)}
                size="sm"
                variant={suspended ? 'outline' : 'destructive'}
              >
                <BanIcon data-icon="inline-start" />
                {suspendActionLabel}
              </Button>
            </>
          }
          subtitle={
            <span className="flex flex-col gap-2">
              <span className="flex flex-wrap items-center gap-2">
                {customer.owners.some(
                  (member) => member.platformRole === 'super_admin',
                ) ? (
                  <Badge variant="info">
                    <ShieldCheckIcon data-icon="inline-start" />
                    Operator workspace
                  </Badge>
                ) : null}
                {suspended ? (
                  <Badge variant="destructive">Suspended</Badge>
                ) : null}
                <Badge
                  variant={planBadgeVariant(customer.effectivePlan?.source)}
                >
                  {customer.effectivePlan?.planName ?? 'No plan'}
                </Badge>
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-mono text-xs">{customer.slug}</span>
                <span>·</span>
                <span>
                  Created {dayjs(customer.createdAt).format('MMM D, YYYY')}
                </span>
                {owner ? (
                  <>
                    <span>·</span>
                    <span>Owner {owner.name || owner.email}</span>
                  </>
                ) : null}
              </span>
            </span>
          }
          title={customer.name}
        />
      </div>

      <Tabs
        onValueChange={(section) =>
          navigate({ search: (prev) => ({ ...prev, section }) })
        }
        value={selectedSection}
      >
        <TabsList
          className="w-full justify-start overflow-x-auto border-b p-0"
          variant="line"
        >
          <TabsTrigger className="h-11 flex-none px-3" value="overview">
            Overview
          </TabsTrigger>
          <TabsTrigger className="h-11 flex-none px-3" value="plan">
            Plan &amp; billing
          </TabsTrigger>
          <TabsTrigger className="h-11 flex-none px-3" value="members">
            Members
            <Badge variant="outline">{customer.seats}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent className="flex flex-col gap-6 pt-4" value="overview">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-medium text-sm">Usage</span>
              <span className="text-muted-foreground text-xs">
                {windowLabel}
              </span>
            </div>
            <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <RefreshingIndicator
                active={analyticsQuery.isFetching}
                error={analyticsQuery.isError && Boolean(analytics)}
              />
              <HistoryRangePicker
                from={visibleSearch.from}
                label="Customer usage"
                maxDays={maxHistoryDays}
                onChange={(next) =>
                  navigate({
                    search: (prev) => ({ ...prev, ...next }),
                  })
                }
                range={visibleSearch.range}
                to={visibleSearch.to}
              />
            </div>
          </div>

          {analyticsQuery.isError ? (
            <Card>
              <CardContent
                aria-live="assertive"
                className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center"
                role="alert"
              >
                <p className="text-destructive text-sm">
                  Couldn’t load usage for this date range.
                </p>
                <Button
                  onClick={() => analyticsQuery.refetch()}
                  size="sm"
                  variant="outline"
                >
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {summary ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Requests"
                sub={`${summary.hitRate.toFixed(0)}% cached`}
                value={compactNumber(summary.totalRequests)}
              />
              <StatCard
                label="Bandwidth delivered"
                sub={`${humanBytes(summary.bandwidthSaved)} saved`}
                value={humanBytes(summary.bandwidthOut)}
              />
              <StatCard
                label="Cache hit rate"
                sub={`${summary.savingsPct.toFixed(0)}% bytes saved`}
                value={`${summary.hitRate.toFixed(1)}%`}
              />
              <StatCard
                label="Avg latency"
                sub={`p95 ${summary.p95}ms`}
                value={`${summary.avg}ms`}
              />
            </div>
          ) : null}
          {!summary && analyticsQuery.isPending ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {['a', 'b', 'c', 'd'].map((key) => (
                <Skeleton className="h-24" key={key} />
              ))}
            </div>
          ) : null}

          {analytics ? <ChartAreaInteractive data={analytics.series} /> : null}
          {!analytics && analyticsQuery.isPending ? (
            <Skeleton className="h-72" />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Quick facts</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <Fact label="Projects" value={customer.projects} />
              <Fact label="Seats" value={customer.seats} />
              <Fact
                label="Last traffic"
                value={
                  customer.usage30d.lastTrafficAt
                    ? dayjs(customer.usage30d.lastTrafficAt).format(
                        'MMM D, YYYY, h:mm A',
                      )
                    : 'No traffic yet'
                }
              />
              <Fact
                label="Owner"
                value={owner ? owner.name || owner.email : 'No owner'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="flex flex-col gap-6 pt-4" value="plan">
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>
                The customer manages their subscription via Polar; operators can
                override it with an internal grant below.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              <Fact
                label="Effective plan"
                value={
                  <Badge
                    variant={planBadgeVariant(customer.effectivePlan?.source)}
                  >
                    {customer.effectivePlan?.planName ?? 'No plan'}
                  </Badge>
                }
              />
              <Fact
                label="Source"
                value={customer.effectivePlan?.source ?? 'No entitled plan'}
              />
              <Fact
                label="Subscription status"
                value={customer.billing.status ?? '—'}
              />
              <Fact
                label={billingPeriodLabel}
                value={
                  customer.billing.currentPeriodEnd
                    ? dayjs(customer.billing.currentPeriodEnd).format(
                        'MMM D, YYYY',
                      )
                    : '—'
                }
              />
              <Fact
                label="Overage allowed"
                value={customer.billing.overageAllowed ? 'Yes' : 'No'}
              />
              <Fact
                label="Internal grant"
                value={
                  customer.internalGrant
                    ? `${customer.internalGrant.planName} · ${customer.internalGrant.active ? 'active' : 'expired'}${customer.internalGrant.expiresAt ? ` · until ${dayjs(customer.internalGrant.expiresAt).format('MMM D, YYYY')}` : ''}`
                    : 'None'
                }
              />
              {customer.internalGrant ? (
                <Fact
                  label="Grant updated"
                  value={dayjs(customer.internalGrant.updatedAt).format(
                    'MMM D, YYYY, h:mm A',
                  )}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Internal plan grant</CardTitle>
              <CardDescription>
                A free operator override that wins over billing when it
                out-ranks the paid plan. Takes effect immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlanChange
                customer={customer}
                key={customer.internalGrant?.updatedAt ?? 'none'}
                onSaved={load}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="pt-4" value="members">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                {customer.seats} member{customer.seats === 1 ? '' : 's'} in this
                organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table containerClassName="rounded-md border">
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Org role</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.members.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={4}>
                        No members.
                      </TableCell>
                    </TableRow>
                  ) : (
                    customer.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {member.name || member.email}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {member.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.orgRole}</Badge>
                        </TableCell>
                        <TableCell>
                          {member.platformRole === 'super_admin' ? (
                            <Badge variant="info">super admin</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              {member.platformRole}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                          {dayjs(member.createdAt).format('MMM D, YYYY')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        onOpenChange={(next) => {
          setConfirmSuspend(next)
          if (!next) {
            setSuspendReason('')
          }
        }}
        open={confirmSuspend}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {suspended ? 'Reactivate customer?' : 'Suspend customer?'}
            </DialogTitle>
            <DialogDescription>
              {suspended
                ? `${customer.name} will be served again immediately.`
                : `${customer.name}'s images stop being served immediately. Use this for abuse, fraud, or non-payment.`}
            </DialogDescription>
          </DialogHeader>
          {suspended ? null : (
            <Input
              aria-label="Suspension reason"
              onChange={(event) => setSuspendReason(event.target.value)}
              placeholder="Reason (optional, internal)"
              value={suspendReason}
            />
          )}
          <DialogFooter>
            <Button
              onClick={() => setConfirmSuspend(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={suspending}
              onClick={handleSuspend}
              variant={suspended ? 'default' : 'destructive'}
            >
              {suspending ? 'Working…' : suspendActionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
