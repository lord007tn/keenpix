import {
  ActivityIcon,
  DatabaseIcon,
  HardDriveIcon,
  type LucideIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getOperationsHealthFn } from '@/functions/admin'
import { humanBytes } from '@/shared/format'

type OperationsHealthData = Awaited<ReturnType<typeof getOperationsHealthFn>>

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
          <p className="text-muted-foreground text-xs">
            {diskUsed}% of {humanBytes(health?.cache.diskMaxBytes ?? 0)} cap
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
          <p className="text-muted-foreground text-xs">
            {memoryUsed}% of {humanBytes(health?.cache.memoryMaxBytes ?? 0)} cap
          </p>
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
          <p className="text-muted-foreground text-xs">
            {health?.transformQueue.concurrency ?? 0} workers,{' '}
            {health?.transformQueue.rejected ?? 0} rejected since boot
          </p>
        </Panel>
      </div>

      <p className="text-muted-foreground text-xs">
        Instance uptime: {health?.uptimeSeconds ?? 0}s. Snapshot generated at{' '}
        {health?.generatedAt ?? 'loading'}.
      </p>
    </div>
  )
}
