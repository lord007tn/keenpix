import dayjs from 'dayjs'
import {
  RefreshCcwIcon,
  SaveIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getErrorMessage } from '@/errors/common'
import {
  getClientAccountsFn,
  updateInternalPlanGrantFn,
} from '@/functions/admin'
import { compactNumber, humanBytes } from '@/shared/format'

type ClientAccount = Awaited<ReturnType<typeof getClientAccountsFn>>[number]
type InternalPlanValue = 'none' | 'basic' | 'pro' | 'business'

const PLAN_LABELS: Record<InternalPlanValue, string> = {
  none: 'No internal plan',
  basic: 'Basic',
  pro: 'Pro',
  business: 'Business',
}

function internalPlanValue(client: ClientAccount): InternalPlanValue {
  const plan = client.internalGrant?.active ? client.internalGrant.plan : null
  if (plan === 'basic' || plan === 'pro' || plan === 'business') {
    return plan
  }
  return 'none'
}

function isInternalPlanValue(value: unknown): value is InternalPlanValue {
  return typeof value === 'string' && value in PLAN_LABELS
}

function planBadgeVariant(source: string | undefined) {
  if (source === 'internal') {
    return 'info'
  }
  if (source === 'billing') {
    return 'success'
  }
  return 'outline'
}

function cacheRate(value: number) {
  return `${Math.round(value * 100)}%`
}

function ownerLabel(client: ClientAccount) {
  const owner = client.owners[0]
  if (!owner) {
    return 'No owner'
  }
  if (client.owners.length === 1) {
    return owner.name || owner.email
  }
  return `${owner.name || owner.email} +${client.owners.length - 1}`
}

export function ClientManagement() {
  const [clients, setClients] = useState<ClientAccount[]>([])
  const [plans, setPlans] = useState<Record<string, InternalPlanValue>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getClientAccountsFn()
      setClients(data)
      setPlans(
        Object.fromEntries(
          data.map((client) => [client.id, internalPlanValue(client)]),
        ),
      )
      setReasons(
        Object.fromEntries(
          data.map((client) => [client.id, client.internalGrant?.reason ?? '']),
        ),
      )
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load clients'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function saveGrant(client: ClientAccount) {
    setSaving(client.id)
    try {
      await updateInternalPlanGrantFn({
        data: {
          orgId: client.id,
          plan: plans[client.id] ?? 'none',
          reason: reasons[client.id] ?? '',
        },
      })
      toast.success('Internal plan updated')
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update internal plan'))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <UsersRoundIcon className="size-4" />
          <span>{clients.length} client organizations</span>
        </div>
        <Button disabled={loading} onClick={load} size="sm" variant="outline">
          <RefreshCcwIcon data-icon="inline-start" />
          Refresh
        </Button>
      </div>

      <Table containerClassName="rounded-md border">
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Effective plan</TableHead>
            <TableHead>Internal plan</TableHead>
            <TableHead>Usage 30d</TableHead>
            <TableHead>Workspace</TableHead>
            <TableHead className="text-right">Save</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell className="text-muted-foreground" colSpan={6}>
                Loading clients...
              </TableCell>
            </TableRow>
          ) : null}
          {clients.length === 0 && !loading ? (
            <TableRow>
              <TableCell className="text-muted-foreground" colSpan={6}>
                No client organizations found.
              </TableCell>
            </TableRow>
          ) : null}
          {clients.map((client) => {
            const source = client.effectivePlan?.source
            const changed =
              (plans[client.id] ?? 'none') !== internalPlanValue(client) ||
              (reasons[client.id] ?? '') !==
                (client.internalGrant?.reason ?? '')
            return (
              <TableRow key={client.id}>
                <TableCell className="min-w-56 whitespace-normal">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {client.name}
                      </span>
                      {client.owners.some(
                        (owner) => owner.platformRole === 'super_admin',
                      ) ? (
                        <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
                      ) : null}
                    </div>
                    <span className="truncate text-muted-foreground text-xs">
                      {ownerLabel(client)}
                    </span>
                    <span className="font-mono text-muted-foreground text-xs">
                      {client.slug}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={planBadgeVariant(source)}>
                      {client.effectivePlan?.planName ?? 'No plan'}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {source ?? 'blocked'}
                    </span>
                    {client.billing.status ? (
                      <span className="text-muted-foreground text-xs">
                        Billing: {client.billing.status}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="min-w-64">
                  <div className="grid gap-2">
                    <Select
                      onValueChange={(value) => {
                        if (isInternalPlanValue(value)) {
                          setPlans((current) => ({
                            ...current,
                            [client.id]: value,
                          }))
                        }
                      }}
                      value={plans[client.id] ?? 'none'}
                    >
                      <SelectTrigger aria-label={`${client.name} plan`}>
                        <SelectValue>
                          {(value) =>
                            value && value in PLAN_LABELS
                              ? PLAN_LABELS[value as InternalPlanValue]
                              : 'Select plan'
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No internal plan</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      aria-label={`${client.name} internal plan reason`}
                      onChange={(event) =>
                        setReasons((current) => ({
                          ...current,
                          [client.id]: event.target.value,
                        }))
                      }
                      placeholder="Reason"
                      value={reasons[client.id] ?? ''}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm">
                    <span>{compactNumber(client.usage30d.requests)} req</span>
                    <span className="text-muted-foreground text-xs">
                      {humanBytes(client.usage30d.bandwidthBytes)} delivered
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {cacheRate(client.usage30d.cacheHitRate)} cache hit
                    </span>
                    {client.usage30d.lastTrafficAt ? (
                      <span className="text-muted-foreground text-xs">
                        Last{' '}
                        {dayjs(client.usage30d.lastTrafficAt).format('MMM D')}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm">
                    <span>{client.projects} projects</span>
                    <span className="text-muted-foreground text-xs">
                      {client.seats} seats
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Created {dayjs(client.createdAt).format('MMM D, YYYY')}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    disabled={!changed || saving === client.id}
                    onClick={() => saveGrant(client)}
                    size="sm"
                    variant={changed ? 'default' : 'outline'}
                  >
                    <SaveIcon data-icon="inline-start" />
                    {saving === client.id ? 'Saving' : 'Save'}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
