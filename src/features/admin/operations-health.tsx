import dayjs from 'dayjs'
import {
  ActivityIcon,
  AlertTriangleIcon,
  CpuIcon,
  DatabaseIcon,
  HardDriveIcon,
  type LucideIcon,
  MemoryStickIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import { getErrorMessage } from '@/errors/common'
import {
  getOperationsHealthFn,
  getResourceTrendFn,
  runCacheMaintenanceFn,
} from '@/functions/admin'
import { humanBytes } from '@/shared/format'

type OperationsHealthData = Awaited<ReturnType<typeof getOperationsHealthFn>>
type ResourceTrendData = Awaited<ReturnType<typeof getResourceTrendFn>>
type CacheMaintenanceTarget = 'all' | 'disk' | 'memory'

// Anything at/above this share of a resource's limit is treated as overload — it
// turns the panel badge red and raises the operational-attention alert.
const PRESSURE_PERCENT = 85

// Near-realtime auto-refresh cadence, matched to the server's resource sampler.
const REFRESH_MS = 5000

function percent(value: number, max: number) {
  if (max <= 0) {
    return 0
  }
  return Math.min(100, Math.round((value / max) * 100))
}

function queueTone(queued: number, maxQueue: number) {
  if (queued === 0) {
    return 'success'
  }
  if (queued >= maxQueue * 0.8) {
    return 'destructive'
  }
  return 'warning'
}

function usageTone(value: number, warnAt: number) {
  if (value >= PRESSURE_PERCENT) {
    return 'destructive'
  }
  if (value >= warnAt) {
    return 'warning'
  }
  return 'secondary'
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-md border bg-background p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">{title}</h3>
      </div>
      {children}
    </section>
  )
}

// Minimal area sparkline for the live ring buffer — no axes; hovering reveals the
// formatted value (CPU % or RAM bytes) at that point.
function Sparkline({
  data,
  dataKey,
  color,
  label,
  format,
}: {
  data: object[]
  dataKey: string
  color: string
  label: string
  format: (value: number) => string
}) {
  return (
    <ChartContainer
      className="aspect-auto h-12 w-full"
      config={{ [dataKey]: { color, label } }}
    >
      <AreaChart data={data} margin={{ bottom: 0, left: 0, right: 0, top: 4 }}>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="size-2 shrink-0 rounded-[2px]"
                      style={{ background: color }}
                    />
                    {label}
                  </span>
                  <span className="font-medium font-mono tabular-nums">
                    {format(Number(value))}
                  </span>
                </div>
              )}
              hideLabel
            />
          }
        />
        <Area
          dataKey={dataKey}
          dot={false}
          fill={color}
          fillOpacity={0.15}
          isAnimationActive={false}
          stroke={color}
          strokeWidth={1.5}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  )
}

// CPU/RAM trend chart. Prefers the persisted hourly peaks (capacity planning),
// but falls back to the live in-memory samples so the chart is never empty on a
// fresh instance — hourly history takes up to an hour to accumulate. Fetched on
// its own so it never blocks the health refresh.
function ResourceTrends({
  liveSeries,
  memLimitBytes,
}: {
  liveSeries: { t: number; cpu: number; mem: number }[]
  memLimitBytes: number
}) {
  const [trend, setTrend] = useState<ResourceTrendData | null>(null)
  const [pending, setPending] = useState(true)

  useEffect(() => {
    let active = true
    getResourceTrendFn({ data: { range: '24h' } })
      .then((data) => {
        if (active) {
          setTrend(data)
        }
      })
      .catch(() => {
        // Trend history is best-effort; the live fallback still renders a chart.
      })
      .finally(() => {
        if (active) {
          setPending(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const hourly = (trend?.points ?? []).map((p) => ({
    cpu: Math.round(p.cpuPeakPct),
    mem:
      p.memLimitBytes > 0
        ? Math.round((p.memPeakBytes / p.memLimitBytes) * 100)
        : 0,
    time: dayjs(p.bucketStart).format('HH:mm'),
  }))

  // Live fallback: the recent ring samples as % of the current cap (or host
  // total), so they line up with the hourly mem% they will eventually become.
  const live = liveSeries.map((s) => ({
    cpu: s.cpu,
    mem: memLimitBytes > 0 ? Math.round((s.mem / memLimitBytes) * 100) : 0,
    time: dayjs(s.t).format('HH:mm:ss'),
  }))

  const usingHourly = hourly.length >= 2
  const rows = usingHourly ? hourly : live

  const config = {
    cpu: { color: 'var(--chart-1)', label: usingHourly ? 'Peak CPU' : 'CPU' },
    mem: { color: 'var(--chart-2)', label: usingHourly ? 'Peak RAM' : 'RAM' },
  } satisfies ChartConfig

  return (
    <section className="flex flex-col gap-3 rounded-md border bg-background p-4">
      <div className="flex items-center gap-2">
        <ActivityIcon className="size-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">
          {usingHourly
            ? 'Resource trends (last 24h)'
            : 'Resource trends (live)'}
        </h3>
      </div>
      {rows.length < 2 ? (
        <p className="text-muted-foreground text-xs">
          {pending
            ? 'Loading trend…'
            : 'Collecting samples — the trend appears within a minute of runtime.'}
        </p>
      ) : (
        <ChartContainer
          className="aspect-auto h-[200px] w-full"
          config={config}
        >
          <LineChart
            data={rows}
            margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="time"
              minTickGap={32}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              width={34}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => (
                    <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="size-2 shrink-0 rounded-[2px]"
                          style={{ background: item.color }}
                        />
                        {config[name as 'cpu' | 'mem']?.label ?? name}
                      </span>
                      <span className="font-medium font-mono tabular-nums">
                        {Math.round(Number(value))}%
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Line
              dataKey="cpu"
              dot={false}
              isAnimationActive={false}
              stroke="var(--color-cpu)"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="mem"
              dot={false}
              isAnimationActive={false}
              stroke="var(--color-mem)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
      )}
      <p className="text-muted-foreground text-xs">
        {usingHourly
          ? 'Peak CPU and RAM (% of limit) per hour. Sustained highs are the signal to raise limits or add an instance.'
          : 'Live CPU and RAM (% of limit). Hourly peaks build over time and replace this once the first hour completes.'}
      </p>
    </section>
  )
}

export function OperationsHealth({ cloud }: { cloud: boolean }) {
  const [health, setHealth] = useState<OperationsHealthData | null>(null)
  const [pending, setPending] = useState(false)
  const [maintenanceTarget, setMaintenanceTarget] =
    useState<CacheMaintenanceTarget | null>(null)

  // `silent` skips the pending flag so the background auto-refresh never flickers
  // the manual button or its spinner.
  const refresh = useCallback(async (silent = false) => {
    if (!silent) {
      setPending(true)
    }
    try {
      setHealth(await getOperationsHealthFn())
    } finally {
      if (!silent) {
        setPending(false)
      }
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(() => refresh(true), REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  const diskUsed = health
    ? percent(health.cache.diskSizeBytes, health.cache.diskMaxBytes)
    : 0
  const memoryUsed = health
    ? percent(health.cache.memorySizeBytes, health.cache.memoryMaxBytes)
    : 0
  const queueUsed = health
    ? percent(health.transformQueue.queued, health.transformQueue.maxQueue)
    : 0
  const queueRejected = health?.transformQueue.rejected ?? 0
  const queueHasBacklog = (health?.transformQueue.queued ?? 0) > 0
  const diskEvictedFiles = health?.cache.diskEvictedFiles ?? 0
  const diskEvictedBytes = health?.cache.diskEvictedBytes ?? 0
  const cacheHitRate = health?.cacheHits.hitRate ?? null

  const resources = health?.resources
  const cpuPercent = resources ? Math.round(resources.cpu.percent) : 0
  const cpuCores = resources?.cpu.cores ?? 0
  const cpuPeak = resources ? Math.round(resources.peaks.cpuPercent) : 0
  const cpuPeakAt = resources?.peaks.cpuAt
    ? dayjs(resources.peaks.cpuAt).format('HH:mm')
    : null
  const loadAvg = resources?.cpu.loadAvg ?? [0, 0, 0]
  // os.loadavg() is [0,0,0] on platforms without it (Windows dev) — hide it then.
  const loadAvgText = loadAvg.some((n) => n > 0)
    ? loadAvg.map((n) => n.toFixed(2)).join(' / ')
    : null
  const memUsed = resources?.memory.usedBytes ?? 0
  const memLimit = resources?.memory.limitBytes ?? 0
  const memPercent = resources ? Math.round(resources.memory.percent) : 0
  const memIsCap = resources?.memory.limitIsCap ?? false
  const memPeak = resources?.peaks.memBytes ?? 0
  const memRss = resources?.memory.rss ?? 0
  const memHeapUsed = resources?.memory.heapUsed ?? 0
  const series = resources?.series ?? []

  // When no cap is set, turn the abstract "set a limit" advice into a concrete
  // value: ~2× the measured RAM peak, rounded up to a clean Docker size, so a
  // transform spike has headroom before the kernel OOM-kills the container.
  const mib = 1024 * 1024
  const suggestedBytes = Math.ceil((memPeak * 2) / (256 * mib)) * 256 * mib
  const suggestedLimit =
    suggestedBytes >= 1024 * mib
      ? `${(suggestedBytes / (1024 * mib)).toFixed(suggestedBytes % (1024 * mib) === 0 ? 0 : 1)}g`
      : `${Math.round(suggestedBytes / mib)}m`

  // The disk and memory caches are bounded LRUs that self-evict, so a high fill
  // is the healthy steady state. Real operational pressure is queue backlog,
  // load shedding, or the container running near its CPU/RAM limit.
  const hasPressure =
    queueUsed >= 75 ||
    queueRejected > 0 ||
    cpuPercent >= PRESSURE_PERCENT ||
    memPercent >= PRESSURE_PERCENT

  async function maintainCache(target: CacheMaintenanceTarget) {
    setMaintenanceTarget(target)
    try {
      const result = await runCacheMaintenanceFn({ data: { target } })
      toast.success(
        target === 'memory'
          ? 'Memory cache cleared'
          : `Deleted ${result.deletedDiskFiles} files (${humanBytes(result.deletedDiskBytes)})`,
      )
      await refresh()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update cache'))
    } finally {
      setMaintenanceTarget(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {health ? `${health.projectCount} projects` : 'Loading'}
          </Badge>
          <Badge
            variant={health?.transformQueue.active ? 'warning' : 'success'}
          >
            {health?.transformQueue.active ?? 0} active transforms
          </Badge>
          {health ? (
            <Badge
              variant={
                cacheHitRate !== null && cacheHitRate >= 80
                  ? 'success'
                  : 'secondary'
              }
            >
              {cacheHitRate === null
                ? 'No cache traffic yet'
                : `${Math.round(cacheHitRate)}% cache hits`}
            </Badge>
          ) : null}
        </div>
        <Button
          disabled={pending}
          onClick={() => refresh()}
          size="sm"
          variant="outline"
        >
          <RefreshCwIcon data-icon="inline-start" />
          Refresh
        </Button>
      </div>

      {hasPressure ? (
        <Alert
          className="border-warning/40 bg-warning/10 text-warning-text"
          variant="default"
        >
          <AlertTriangleIcon />
          <AlertTitle>Operational attention needed</AlertTitle>
          <AlertDescription>
            {cpuPercent >= PRESSURE_PERCENT
              ? `CPU is at ${cpuPercent}% of the available cores. `
              : null}
            {memPercent >= PRESSURE_PERCENT
              ? `Memory is at ${memPercent}% of the limit — close to an OOM kill. `
              : null}
            {queueUsed >= 75
              ? `Transform queue is ${queueUsed}% full; requests may start shedding. `
              : null}
            {queueRejected > 0
              ? `${queueRejected} transform requests were rejected since boot.`
              : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel icon={CpuIcon} title="CPU">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-2xl tabular-nums">
              {cpuPercent}%
            </span>
            <span className="text-muted-foreground text-sm">
              {cpuCores
                ? `${cpuCores % 1 === 0 ? cpuCores : cpuCores.toFixed(1)} cores`
                : ''}
            </span>
          </div>
          <Progress aria-label="CPU usage" value={cpuPercent} />
          {series.length > 1 ? (
            <Sparkline
              color="var(--chart-1)"
              data={series}
              dataKey="cpu"
              format={(v) => `${v}%`}
              label="CPU"
            />
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant={usageTone(cpuPercent, 60)}>
              peak {cpuPeak}%{cpuPeakAt ? ` · ${cpuPeakAt}` : ''}
            </Badge>
            {loadAvgText ? (
              <span className="text-muted-foreground text-xs">
                load {loadAvgText}
              </span>
            ) : null}
          </div>
        </Panel>

        <Panel icon={MemoryStickIcon} title="Memory (RAM)">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-2xl tabular-nums">
              {humanBytes(memUsed)}
            </span>
            <span className="text-muted-foreground text-sm">
              of {humanBytes(memLimit)}
              {memIsCap ? '' : ' host'}
            </span>
          </div>
          <Progress aria-label="Memory usage" value={memPercent} />
          {series.length > 1 ? (
            <Sparkline
              color="var(--chart-2)"
              data={series}
              dataKey="mem"
              format={(v) => humanBytes(v)}
              label="RAM"
            />
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant={usageTone(memPercent, 70)}>
              {memPercent}% · peak {humanBytes(memPeak)}
            </Badge>
            <span className="text-muted-foreground text-xs">
              RSS {humanBytes(memRss)} · heap {humanBytes(memHeapUsed)}
            </span>
          </div>
          {memIsCap ? null : (
            <p className="text-muted-foreground text-xs">
              No container memory limit set — gauge shows host total.{' '}
              {memPeak > 0 ? (
                <>
                  Peak so far is {humanBytes(memPeak)}; set{' '}
                  <code className="rounded bg-muted px-1 font-mono">
                    KEENPIX_MEM_LIMIT={suggestedLimit}
                  </code>{' '}
                  in compose (~2× peak) to cap with headroom.
                </>
              ) : (
                'Set KEENPIX_MEM_LIMIT in compose to cap and track real headroom.'
              )}
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={HardDriveIcon} title="Disk cache">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-2xl tabular-nums">
              {humanBytes(health?.cache.diskSizeBytes ?? 0)}
            </span>
            <span className="text-muted-foreground text-sm">
              {health?.cache.diskFileCount ?? 0} files
            </span>
          </div>
          <Progress aria-label="Disk cache usage" value={diskUsed} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="secondary">
              {diskUsed}% of {humanBytes(health?.cache.diskMaxBytes ?? 0)}
            </Badge>
            {cloud ? null : (
              <Button
                disabled={!!maintenanceTarget}
                onClick={() => maintainCache('disk')}
                size="sm"
                variant="outline"
              >
                <Trash2Icon data-icon="inline-start" />
                {maintenanceTarget === 'disk' ? 'Clearing...' : 'Clear disk'}
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {diskEvictedFiles > 0
              ? `Bounded cache — evicted ${diskEvictedFiles} files (${humanBytes(diskEvictedBytes)}) since boot.`
              : 'Bounded cache — no evictions since boot; current cap fits the working set.'}
          </p>
        </Panel>

        <Panel icon={DatabaseIcon} title="Memory cache">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-2xl tabular-nums">
              {humanBytes(health?.cache.memorySizeBytes ?? 0)}
            </span>
            <span className="text-muted-foreground text-sm">
              {health?.cache.memoryItemCount ?? 0} hot items
            </span>
          </div>
          <Progress aria-label="Memory cache usage" value={memoryUsed} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="secondary">
              {memoryUsed}% of {humanBytes(health?.cache.memoryMaxBytes ?? 0)}
            </Badge>
            {cloud ? null : (
              <Button
                disabled={!!maintenanceTarget}
                onClick={() => maintainCache('memory')}
                size="sm"
                variant="outline"
              >
                <Trash2Icon data-icon="inline-start" />
                {maintenanceTarget === 'memory'
                  ? 'Clearing...'
                  : 'Clear memory'}
              </Button>
            )}
          </div>
        </Panel>

        <Panel icon={ActivityIcon} title="Transform queue">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-2xl tabular-nums">
              {health?.transformQueue.queued ?? 0}
            </span>
            <Badge
              variant={
                health
                  ? queueTone(
                      health.transformQueue.queued,
                      health.transformQueue.maxQueue,
                    )
                  : 'secondary'
              }
            >
              {health?.transformQueue.status ?? 'loading'}
            </Badge>
          </div>
          <Progress aria-label="Transform queue usage" value={queueUsed} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs">
              {health?.transformQueue.concurrency ?? 0} workers, {queueRejected}{' '}
              rejected since boot
            </span>
            <Badge variant={queueHasBacklog ? 'warning' : 'outline'}>
              max {health?.transformQueue.maxQueue ?? 0}
            </Badge>
          </div>
        </Panel>
      </div>

      {cloud ? null : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-3">
          <div className="min-w-0">
            <h3 className="font-medium text-sm">Cache maintenance</h3>
            <p className="text-muted-foreground text-xs">
              Clear hot memory entries, disk variants, or both when storage
              pressure is high or after changing transform policy.
            </p>
          </div>
          <Button
            disabled={!!maintenanceTarget}
            onClick={() => maintainCache('all')}
            size="sm"
            variant="destructive"
          >
            <Trash2Icon data-icon="inline-start" />
            {maintenanceTarget === 'all' ? 'Clearing...' : 'Clear all cache'}
          </Button>
        </div>
      )}

      <ResourceTrends liveSeries={series} memLimitBytes={memLimit} />

      <p className="text-muted-foreground text-xs">
        Instance uptime: {health?.uptimeSeconds ?? 0}s. Snapshot generated at{' '}
        {health?.generatedAt ?? 'loading'}.
        {health
          ? ` Served ${health.cacheHits.totalRequests} requests since boot.`
          : null}
      </p>
    </div>
  )
}
