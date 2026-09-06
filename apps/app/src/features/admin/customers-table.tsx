import { useNavigate } from '@tanstack/react-router'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import { ArrowUpDownIcon, RefreshCcwIcon, ShieldCheckIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getErrorMessage } from '@/errors/common'
import { getCustomerAccountsFn } from '@/functions/admin'
import { cn } from '@/lib/cn/utils'
import { compactNumber, humanBytes } from '@/shared/format'

type CustomerAccount = Awaited<ReturnType<typeof getCustomerAccountsFn>>[number]

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function planBadgeVariant(source: string | null | undefined) {
  if (source === 'admin_grant') {
    return 'info' as const
  }
  if (source === 'polar') {
    return 'success' as const
  }
  return 'outline' as const
}

function ownerLabel(customer: CustomerAccount) {
  const owner = customer.owners[0]
  if (!owner) {
    return 'No owner'
  }
  const base = owner.name || owner.email
  return customer.owners.length > 1
    ? `${base} +${customer.owners.length - 1}`
    : base
}

function SortHeader({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button className="-ml-2 h-8" onClick={onClick} size="sm" variant="ghost">
      {children}
      <ArrowUpDownIcon className="ml-1 size-3.5" />
    </Button>
  )
}

const columns: ColumnDef<CustomerAccount>[] = [
  {
    accessorKey: 'name',
    header: 'Customer',
    cell: ({ row }) => {
      const customer = row.original
      return (
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{customer.name}</span>
            {customer.members.some(
              (member) => member.platformRole === 'super_admin',
            ) ? (
              <ShieldCheckIcon className="size-3.5 shrink-0 text-primary" />
            ) : null}
            {customer.suspendedAt ? (
              <Badge variant="destructive">Suspended</Badge>
            ) : null}
          </div>
          <span className="truncate text-muted-foreground text-xs">
            {ownerLabel(customer)}
          </span>
          <span className="truncate font-mono text-muted-foreground text-xs">
            {customer.slug}
          </span>
        </div>
      )
    },
  },
  {
    id: 'plan',
    accessorFn: (row) => row.effectivePlan?.plan ?? '',
    header: 'Plan',
    cell: ({ row }) => {
      const { effectivePlan } = row.original
      let sourceLabel = 'Free'
      if (effectivePlan?.source === 'polar') {
        sourceLabel = 'Polar'
      } else if (effectivePlan?.source === 'admin_grant') {
        sourceLabel = 'Complimentary'
      }
      return (
        <div className="flex flex-col gap-0.5">
          <Badge variant={planBadgeVariant(effectivePlan?.source)}>
            {effectivePlan?.planName ?? 'Free'}
          </Badge>
          <span className="text-muted-foreground text-xs">{sourceLabel}</span>
        </div>
      )
    },
  },
  {
    id: 'requests',
    accessorFn: (row) => row.usage30d.attemptedRequests,
    header: ({ column }) => (
      <SortHeader
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Requests 30d
      </SortHeader>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5 tabular-nums">
        <span>{compactNumber(row.original.usage30d.attemptedRequests)}</span>
        <span className="text-muted-foreground text-xs">
          {compactNumber(row.original.usage30d.requests)} delivered
        </span>
      </div>
    ),
  },
  {
    id: 'bandwidth',
    accessorFn: (row) => row.usage30d.totalBandwidthBytes,
    header: ({ column }) => (
      <SortHeader
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Managed delivery 30d
      </SortHeader>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5 tabular-nums">
        <span>{humanBytes(row.original.usage30d.totalBandwidthBytes)}</span>
        <span className="text-muted-foreground text-xs">
          {humanBytes(row.original.usage30d.bandwidthBytes)} application
        </span>
      </div>
    ),
  },
  {
    id: 'mrr',
    accessorFn: (row) => row.finance30d.mrrCents,
    header: ({ column }) => (
      <SortHeader
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        MRR
      </SortHeader>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {money.format(row.original.finance30d.mrrCents / 100)}
      </span>
    ),
  },
  {
    id: 'cost',
    accessorFn: (row) => row.finance30d.costCents ?? -1,
    header: ({ column }) => (
      <SortHeader
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Cost 30d
      </SortHeader>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.finance30d.costCents === null
          ? '—'
          : money.format(row.original.finance30d.costCents / 100)}
      </span>
    ),
  },
  {
    id: 'contribution',
    accessorFn: (row) => row.finance30d.contributionCents ?? -1,
    header: ({ column }) => (
      <SortHeader
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Contribution
      </SortHeader>
    ),
    cell: ({ row }) => (
      <span
        className={cn(
          'tabular-nums',
          row.original.finance30d.contributionCents !== null &&
            row.original.finance30d.contributionCents < 0 &&
            'text-destructive',
        )}
      >
        {row.original.finance30d.contributionCents === null
          ? '—'
          : money.format(row.original.finance30d.contributionCents / 100)}
      </span>
    ),
  },
  {
    id: 'seats',
    accessorFn: (row) => row.seats,
    header: 'Workspace',
    cell: ({ row }) => (
      <div className="flex flex-col text-muted-foreground text-xs">
        <span>{row.original.projects} projects</span>
        <span>{row.original.seats} seats</span>
      </div>
    ),
  },
  {
    id: 'created',
    accessorFn: (row) => row.createdAt,
    header: ({ column }) => (
      <SortHeader
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Created
      </SortHeader>
    ),
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground text-xs">
        {dayjs(row.original.createdAt).format('MMM D, YYYY')}
      </span>
    ),
  },
]

export function CustomersTable() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<CustomerAccount[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      setCustomers(await getCustomerAccountsFn())
    } catch (error) {
      setLoadError(true)
      toast.error(getErrorMessage(error, 'Could not load customers'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const query = search.trim().toLowerCase()
  const rows = useMemo(
    () =>
      query
        ? customers.filter((customer) =>
            [
              customer.name,
              customer.slug,
              ...customer.owners.map((owner) => owner.email),
            ].some((value) => value.toLowerCase().includes(query)),
          )
        : customers,
    [customers, query],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  let emptyMessage = 'No customers yet.'
  if (loading) {
    emptyMessage = 'Loading customers…'
  } else if (loadError) {
    emptyMessage = 'Couldn’t load customers. Use Refresh to try again.'
  } else if (query) {
    emptyMessage = 'No customers match your search.'
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted-foreground text-sm">
          {customers.length} customer{customers.length === 1 ? '' : 's'}
        </span>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          <Input
            aria-label="Search customers"
            className="w-full sm:w-56"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, slug, or owner…"
            value={search}
          />
          <Button disabled={loading} onClick={load} variant="outline">
            <RefreshCcwIcon data-icon="inline-start" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <Table className="min-w-[1180px]">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((r) => (
                <TableRow
                  className={cn(
                    'cursor-pointer',
                    r.original.suspendedAt && 'opacity-70',
                  )}
                  key={r.id}
                  onClick={() =>
                    navigate({
                      to: '/admin/customers/$orgId',
                      params: { orgId: r.original.id },
                    })
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate({
                        to: '/admin/customers/$orgId',
                        params: { orgId: r.original.id },
                      })
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {r.getVisibleCells().map((c) => (
                    <TableCell key={c.id}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="h-24 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <p className="text-muted-foreground text-xs">
        Requests and managed delivery combine customer-scoped Edge delivery with
        application responses; delivered values include successful responses
        only. Cost combines Polar fees, modeled Edge and origin delivery, and a
        delivery-weighted share of fixed operations. Contribution is current
        paid MRR minus that total cost.
      </p>
    </div>
  )
}
