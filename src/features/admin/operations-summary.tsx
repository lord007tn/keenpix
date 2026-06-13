import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { getOperationsHealthFn } from '@/functions/admin'
import { humanBytes } from '@/shared/format'

type Health = Awaited<ReturnType<typeof getOperationsHealthFn>>

function fill(value: number, max: number) {
  return max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
}

function CacheStat({
  label,
  max,
  used,
}: {
  label: string
  max: number
  used: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-semibold text-xl tabular-nums">
        {humanBytes(used)}
      </span>
      <Progress value={fill(used, max)} />
      <span className="text-muted-foreground text-xs">
        {fill(used, max)}% of {humanBytes(max)}
      </span>
    </div>
  )
}

// A read-only glimpse of instance health for the dashboard; the full panel with
// cache-maintenance controls lives on the Operations page.
export function OperationsSummary() {
  const [health, setHealth] = useState<Health | null>(null)

  useEffect(() => {
    let active = true
    getOperationsHealthFn()
      .then((h) => {
        if (active) {
          setHealth(h)
        }
      })
      .catch(() => {
        // Operations health is a glimpse; failure just leaves the placeholder.
      })
    return () => {
      active = false
    }
  }, [])

  const queued = health?.transformQueue.queued ?? 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">Operations</CardTitle>
          <CardDescription>Cache & transform-queue health</CardDescription>
        </div>
        <Link
          className="text-muted-foreground text-xs hover:text-foreground"
          to="/app/operations"
        >
          View →
        </Link>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-3">
        <CacheStat
          label="Disk cache"
          max={health?.cache.diskMaxBytes ?? 0}
          used={health?.cache.diskSizeBytes ?? 0}
        />
        <CacheStat
          label="Memory cache"
          max={health?.cache.memoryMaxBytes ?? 0}
          used={health?.cache.memorySizeBytes ?? 0}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">Transform queue</span>
          <span className="font-semibold text-xl tabular-nums">
            {queued}
            <span className="ml-1 text-muted-foreground text-xs">queued</span>
          </span>
          <div>
            <Badge variant={queued > 0 ? 'warning' : 'success'}>
              {health?.transformQueue.status ?? 'loading'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
