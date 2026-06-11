import {
  ActivityIcon,
  AlertTriangleIcon,
  DatabaseIcon,
  HardDriveIcon,
  type LucideIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getErrorMessage } from '@/errors/common'
import { getOperationsHealthFn, runCacheMaintenanceFn } from '@/functions/admin'
import { humanBytes } from '@/shared/format'

type OperationsHealthData = Awaited<ReturnType<typeof getOperationsHealthFn>>
type CacheMaintenanceTarget = 'all' | 'disk' | 'memory'

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

function usageTone(value: number) {
  if (value >= 90) {
    return 'destructive'
  }
  if (value >= 75) {
    return 'warning'
  }
  return 'success'
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

export function OperationsHealth() {
  const [health, setHealth] = useState<OperationsHealthData | null>(null)
  const [pending, setPending] = useState(false)
  const [maintenanceTarget, setMaintenanceTarget] =
    useState<CacheMaintenanceTarget | null>(null)

  const refresh = useCallback(async () => {
    setPending(true)
    try {
      setHealth(await getOperationsHealthFn())
    } finally {
      setPending(false)
    }
  }, [])

  useEffect(() => {
    refresh()
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
  const hasPressure =
    diskUsed >= 75 || memoryUsed >= 75 || queueUsed >= 75 || queueRejected > 0

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
        </div>
        <Button
          disabled={pending}
          onClick={refresh}
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
            {diskUsed >= 75 ? `Disk cache is ${diskUsed}% full. ` : null}
            {memoryUsed >= 75 ? `Memory cache is ${memoryUsed}% full. ` : null}
            {queueUsed >= 75 ? `Transform queue is ${queueUsed}% full. ` : null}
            {queueRejected > 0
              ? `${queueRejected} transform requests were rejected since boot.`
              : null}
          </AlertDescription>
        </Alert>
      ) : null}

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
            <Badge variant={usageTone(diskUsed)}>
              {diskUsed}% of {humanBytes(health?.cache.diskMaxBytes ?? 0)}
            </Badge>
            <Button
              disabled={!!maintenanceTarget}
              onClick={() => maintainCache('disk')}
              size="sm"
              variant="outline"
            >
              <Trash2Icon data-icon="inline-start" />
              {maintenanceTarget === 'disk' ? 'Clearing...' : 'Clear disk'}
            </Button>
          </div>
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
            <Badge variant={usageTone(memoryUsed)}>
              {memoryUsed}% of {humanBytes(health?.cache.memoryMaxBytes ?? 0)}
            </Badge>
            <Button
              disabled={!!maintenanceTarget}
              onClick={() => maintainCache('memory')}
              size="sm"
              variant="outline"
            >
              <Trash2Icon data-icon="inline-start" />
              {maintenanceTarget === 'memory' ? 'Clearing...' : 'Clear memory'}
            </Button>
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

      <p className="text-muted-foreground text-xs">
        Instance uptime: {health?.uptimeSeconds ?? 0}s. Snapshot generated at{' '}
        {health?.generatedAt ?? 'loading'}.
      </p>
    </div>
  )
}
