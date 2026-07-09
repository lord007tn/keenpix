import { Link } from '@tanstack/react-router'
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
import { PageHeader } from '@/components/app/page-header'
import { StatCard } from '@/components/app/stat-card'
import { Badge } from '@/components/ui/badge'
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
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getErrorMessage } from '@/errors/common'
import { PlanChange } from '@/features/admin/plan-change'
import { getCustomerAccountFn, setOrgSuspensionFn } from '@/functions/admin'
import { authClient } from '@/lib/auth/client'
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

export function CustomerDetail({ orgId }: { orgId: string }) {
  const [customer, setCustomer] = useState<CustomerAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonating, setImpersonating] = useState(false)
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspending, setSuspending] = useState(false)

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
      // Full reload into the tenant app as this customer's owner.
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
          className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          to="/admin/customers"
        >
          <ArrowLeftIcon className="size-4" />
          Back to customers
        </Link>
        <p className="text-muted-foreground text-sm">Customer not found.</p>
      </div>
    )
  }

  const usage = customer.usage30d
  const suspended = Boolean(customer.suspendedAt)
  const suspendActionLabel = suspended ? 'Reactivate' : 'Suspend'

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          to="/admin/customers"
        >
          <ArrowLeftIcon className="size-4" />
          Back to customers
        </Link>
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
                {suspended ? 'Reactivate' : 'Suspend'}
              </Button>
            </>
          }
          eyebrow="Customer"
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
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
          }
          title={
            <span className="flex items-center gap-2">
              {customer.name}
              {customer.owners.some(
                (member) => member.platformRole === 'super_admin',
              ) ? (
                <ShieldCheckIcon className="size-4 text-primary" />
              ) : null}
              {suspended ? (
                <Badge variant="destructive">Suspended</Badge>
              ) : null}
            </span>
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Requests (30d)"
          sub={`${compactNumber(usage.cachedRequests)} cached`}
          value={compactNumber(usage.requests)}
        />
        <StatCard
          label="Bandwidth (30d)"
          sub="delivered"
          value={humanBytes(usage.bandwidthBytes)}
        />
        <StatCard
          label="Cache hit rate"
          sub={`${humanBytes(usage.bytesSaved)} saved`}
          value={`${Math.round(usage.cacheHitRate * 100)}%`}
        />
        <StatCard
          label="Workspace"
          sub={`${customer.seats} seats · last ${usage.lastTrafficAt ? dayjs(usage.lastTrafficAt).format('MMM D') : '—'}`}
          value={`${customer.projects} projects`}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <CardTitle>Plan &amp; entitlements</CardTitle>
              <CardDescription>
                Set an operator internal plan grant. Billing is managed by the
                customer via Polar.
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={planBadgeVariant(customer.effectivePlan?.source)}>
                {customer.effectivePlan?.planName ?? 'No plan'}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {customer.effectivePlan?.source
                  ? `via ${customer.effectivePlan.source}`
                  : 'not served'}
                {customer.billing.status
                  ? ` · billing ${customer.billing.status}`
                  : ''}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PlanChange customer={customer} onSaved={load} />
        </CardContent>
      </Card>

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
