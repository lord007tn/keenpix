import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn/utils'

// First-load placeholders for the analytics + overview pages — shown only when
// there is no data at all yet (stale-while-revalidate keeps real data on screen
// the rest of the time). Each skeleton is sized to the component it stands in for
// so swapping skeleton → content does not shift the layout. The page header
// renders live above these, so these are body-only.

function placeholderKeys(count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`)
}

function StatCardSkeleton() {
  return (
    <Card className="gap-0">
      <CardContent className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-3 w-20" />
        <div className="mt-auto flex flex-col gap-2 pt-3">
          <Skeleton className="h-1.5 w-full" />
          <div className="flex flex-col gap-2 border-t pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function KpiRowSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {placeholderKeys(4, 'kpi').map((k) => (
        <StatCardSkeleton key={k} />
      ))}
    </div>
  )
}

function ChartCardSkeleton({
  className,
  height = 'h-64',
}: {
  className?: string
  height?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className={cn('w-full', height)} />
      </CardContent>
    </Card>
  )
}

function BarListSkeleton({ rows = 8 }: { rows?: number }) {
  const widths = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12', 'w-7/12']
  return (
    <Card>
      <CardHeader className="gap-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-44" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          {placeholderKeys(rows, 'bar').map((k, i) => (
            <Skeleton
              className={cn(
                'h-6 rounded-md',
                widths[Math.min(i, widths.length - 1)],
              )}
              key={k}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function DonutCardSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Skeleton className="aspect-square h-44 rounded-full" />
        <div className="flex w-full flex-col gap-2">
          {placeholderKeys(4, 'donut-legend').map((k) => (
            <Skeleton className="h-3 w-full" key={k} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LatencyCardSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-40" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-6">
          {placeholderKeys(6, 'pct').map((k) => (
            <div className="flex flex-col gap-1.5" key={k}>
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  )
}

function TableCardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader className="gap-1.5">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-60" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {placeholderKeys(rows, 'table-row').map((k) => (
          <Skeleton className="h-8 w-full" key={k} />
        ))}
      </CardContent>
    </Card>
  )
}

// Overview body placeholder (KPI row, latency, the main chart, the project table).
export function DashboardBodySkeleton() {
  return (
    <>
      <KpiRowSkeleton />
      <LatencyCardSkeleton />
      <ChartCardSkeleton height="h-[250px]" />
      <TableCardSkeleton rows={4} />
    </>
  )
}

// Analytics body placeholder mirroring the page's sections.
export function AnalyticsBodySkeleton() {
  return (
    <>
      <KpiRowSkeleton />
      <ChartCardSkeleton />
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid gap-4 lg:grid-cols-2">
          <DonutCardSkeleton />
          <LatencyCardSkeleton />
        </div>
        <ChartCardSkeleton height="h-56" />
        <div className="grid gap-4 lg:grid-cols-2">
          <BarListSkeleton />
          <BarListSkeleton />
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-44" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCardSkeleton height="h-56" />
          <ChartCardSkeleton height="h-56" />
        </div>
      </section>
    </>
  )
}
