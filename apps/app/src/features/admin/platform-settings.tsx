import {
  CheckCircle2Icon,
  CloudIcon,
  DatabaseIcon,
  HardDriveIcon,
  ServerIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SettingRow } from '@/components/app/setting-row'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/errors/common'
import { getPlatformConfigFn } from '@/functions/admin'
import { humanBytes } from '@/shared/format'

type PlatformConfig = Awaited<ReturnType<typeof getPlatformConfigFn>>

const MAX_AGE_RE = /max-age=(\d+)/

function humanizeMaxAge(cacheControl: string) {
  const match = cacheControl.match(MAX_AGE_RE)
  if (!match) {
    return 'no max-age'
  }
  const seconds = Number(match[1])
  const days = seconds / 86_400
  if (days >= 365) {
    const years = days / 365
    return `${Number.isInteger(years) ? years : years.toFixed(1)} year${years >= 2 ? 's' : ''}`
  }
  if (days >= 1) {
    return `${Math.round(days)} day${days >= 2 ? 's' : ''}`
  }
  return `${Math.round(seconds / 3600)}h`
}

function Value({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-sm">{children}</span>
}

export function PlatformSettings() {
  const [config, setConfig] = useState<PlatformConfig | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      setConfig(await getPlatformConfigFn())
    } catch (error) {
      setLoadFailed(true)
      toast.error(getErrorMessage(error, 'Could not load configuration'))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!config) {
    if (loadFailed) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Couldn’t load platform configuration</CardTitle>
            <CardDescription>
              The operator settings request failed. Retry to run the live
              integration checks again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={load} variant="outline">
              Try again
            </Button>
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    )
  }

  const { deployment, cache, cloudflare } = config
  const isCloud = deployment.mode === 'cloud'
  const immutable = cache.cacheControl.includes('immutable')
  let cloudflareStatus = <Badge variant="outline">Not configured</Badge>
  if (cloudflare.connectionStatus === 'connected') {
    cloudflareStatus = (
      <Badge variant="success">
        <CheckCircle2Icon data-icon="inline-start" />
        Connected
      </Badge>
    )
  } else if (cloudflare.connectionStatus === 'connected_no_data') {
    cloudflareStatus = (
      <Badge variant="info">
        <CheckCircle2Icon data-icon="inline-start" />
        Connected; no recent matching traffic
      </Badge>
    )
  } else if (cloudflare.connectionStatus === 'failed') {
    cloudflareStatus = (
      <Badge variant="destructive">
        <TriangleAlertIcon data-icon="inline-start" />
        Connection check failed
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerIcon className="size-4 text-muted-foreground" />
              Deployment
            </CardTitle>
            <CardDescription>How this instance is running.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SettingRow description="KEENPIX_MODE" label="Mode">
              <Badge variant={isCloud ? 'info' : 'outline'}>
                {isCloud ? 'Cloud (multi-tenant)' : 'Self-host'}
              </Badge>
            </SettingRow>
            <SettingRow description="Running application build" label="Version">
              <Value>v{deployment.version}</Value>
            </SettingRow>
            <SettingRow
              description="KEENPIX_APP_URL / BETTER_AUTH_URL"
              label="App URL"
            >
              <span className="font-mono text-muted-foreground text-sm">
                {deployment.appUrl}
              </span>
            </SettingRow>
            <SettingRow
              description="CLICKHOUSE_URL — powers advanced analytics"
              label="ClickHouse analytics"
            >
              <Badge variant={deployment.clickhouse ? 'success' : 'outline'}>
                {deployment.clickhouse ? 'Enabled' : 'Postgres rollups only'}
              </Badge>
            </SettingRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDriveIcon className="size-4 text-muted-foreground" />
              Cache
            </CardTitle>
            <CardDescription>
              Environment-driven — tune via env vars, not the UI.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SettingRow
              description="KEENPIX_CACHE_CONTROL — response header"
              label="Edge / browser TTL"
            >
              <div className="flex items-center gap-2">
                <Value>{humanizeMaxAge(cache.cacheControl)}</Value>
                {immutable ? <Badge variant="outline">immutable</Badge> : null}
              </div>
            </SettingRow>
            <SettingRow
              description="KEENPIX_CACHE_STALE_MS — stale-while-revalidate"
              label="Stale window"
            >
              <Value>{(cache.staleMs / 3_600_000).toFixed(1)}h</Value>
            </SettingRow>
            <SettingRow
              description="KEENPIX_CACHE_MAX_BYTES"
              label="Disk cache cap"
            >
              <Value>{humanBytes(cache.diskMaxBytes)}</Value>
            </SettingRow>
            <SettingRow
              description="KEENPIX_MEMORY_CACHE_MAX_BYTES"
              label="Memory cache cap"
            >
              <Value>{humanBytes(cache.memoryMaxBytes)}</Value>
            </SettingRow>
            <SettingRow
              description="KEENPIX_CACHE_S3_* — durable L2 tier"
              label="Storage tier"
            >
              <span className="flex items-center gap-1.5">
                {cache.storageTier === 'object' ? (
                  <DatabaseIcon className="size-3.5 text-muted-foreground" />
                ) : (
                  <HardDriveIcon className="size-3.5 text-muted-foreground" />
                )}
                <Value>
                  {cache.storageTier === 'object'
                    ? 'Shared object storage (R2/S3)'
                    : 'Local disk'}
                </Value>
              </span>
            </SettingRow>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudIcon className="size-4 text-muted-foreground" />
            Cloudflare edge analytics
          </CardTitle>
          <CardDescription>
            Read-only edge cache hit-rate and project attribution, sourced from
            CLOUDFLARE_* env vars (zone Analytics → Read plus account Account
            Analytics → Read).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SettingRow description="Live integration status" label="Status">
            {cloudflareStatus}
          </SettingRow>
          <SettingRow description="Resolved from" label="Source">
            <Badge variant={cloudflare.source === 'none' ? 'outline' : 'info'}>
              {cloudflare.source}
            </Badge>
          </SettingRow>
          <SettingRow description="CLOUDFLARE_ZONE_ID" label="Zone">
            <span className="font-mono text-muted-foreground text-sm">
              {cloudflare.zoneId || '—'}
            </span>
          </SettingRow>
          <SettingRow
            description="CLOUDFLARE_HOST — optional image-host filter"
            label="Host filter"
          >
            <span className="font-mono text-muted-foreground text-sm">
              {cloudflare.host || '—'}
            </span>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  )
}
