import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn/utils'

// Stable keys for static placeholder lists (these never reorder), so React and
// the lint rule against array-index keys both stay satisfied.
function placeholderKeys(count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`)
}

// Loading placeholders for the analytics + overview surfaces. Every skeleton is
// sized to the component it stands in for so swapping skeleton → content does
// not shift the layout. All built on the shared `Skeleton` primitive (muted,
// animate-pulse) and shadcn tokens.

// One KPI / source-split card: label, headline number, then the pinned bar +
// two-row legend that `SourceSplitCard` renders at the bottom.
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

// The four-up KPI row shared by both pages.
export function KpiRowSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {placeholderKeys(4, 'kpi').map((k) => (
        <StatCardSkeleton key={k} />
      ))}
    </div>
  )
}

// A titled card whose body is a chart placeholder of the matching height.
// Heights mirror the real charts: h-64 (area/compare/edge), h-[250px] (overview
// interactive), h-56 (trend/status/bandwidth-saved).
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

// Rows of descending bars, matching the BarList used for Top images and Traffic
// by country.
function BarListSkeleton({ rows = 8 }: { rows?: number }) {
  const widths = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12', 'w-7/12']
  return (
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
  )
}

// The donut + legend in the Format distribution card.
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

// A header/body table placeholder for the projects / breakdown tables.
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

function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-72" />
      </div>
      <Skeleton className="h-8 w-56" />
    </div>
  )
}

// Full-page skeleton shown by the Overview route while its loader runs.
export function DashboardPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <PageHeaderSkeleton />
      <KpiRowSkeleton />
      <Card>
        <CardHeader className="gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-52" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
      <ChartCardSkeleton height="h-[250px]" />
      <TableCardSkeleton rows={4} />
    </div>
  )
}

// Full-page skeleton shown by the Analytics route while its loader runs.
export function AnalyticsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeaderSkeleton />

      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <KpiRowSkeleton />
      </section>

      <ChartCardSkeleton />

      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid gap-4 lg:grid-cols-2">
          <DonutCardSkeleton />
          <ChartCardSkeleton height="h-32" />
        </div>
        <ChartCardSkeleton height="h-56" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </CardHeader>
            <CardContent>
              <BarListSkeleton />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="gap-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-44" />
            </CardHeader>
            <CardContent>
              <BarListSkeleton />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-44" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCardSkeleton height="h-56" />
          <ChartCardSkeleton height="h-56" />
        </div>
      </section>
    </div>
  )
}
