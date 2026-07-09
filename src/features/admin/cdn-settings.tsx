import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SettingRow } from '@/components/app/setting-row'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/errors/common'
import { getCdnConfigFn } from '@/functions/admin'
import { humanBytes } from '@/shared/format'

type CdnConfig = Awaited<ReturnType<typeof getCdnConfigFn>>

function ReadOnlyValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-muted-foreground text-sm">{children}</span>
  )
}

// Read-only view of the CDN / cache configuration. All of it is environment-
// driven now (KEENPIX_CACHE_* / CLOUDFLARE_*), so this surfaces the effective
// values rather than offering an editable form.
export function CdnSettings() {
  const [config, setConfig] = useState<CdnConfig | null>(null)

  const load = useCallback(async () => {
    try {
      setConfig(await getCdnConfigFn())
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load CDN config'))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!config) {
    return <Skeleton className="h-64" />
  }

  const { cloudflare } = config

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Cache</CardTitle>
          <CardDescription>
            Configured entirely via environment variables. Change these in your
            deployment env, not here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SettingRow
            description="KEENPIX_CACHE_CONTROL — header on transform responses"
            label="Cache-Control"
          >
            <ReadOnlyValue>{config.cacheControl}</ReadOnlyValue>
          </SettingRow>
          <SettingRow
            description="KEENPIX_CACHE_STALE_MS — internal stale-while-revalidate window"
            label="Stale window"
          >
            <ReadOnlyValue>
              {(config.cacheStaleMs / 3_600_000).toFixed(1)}h
            </ReadOnlyValue>
          </SettingRow>
          <SettingRow
            description="KEENPIX_CACHE_MAX_BYTES — durable disk cache cap"
            label="Disk cache cap"
          >
            <ReadOnlyValue>{humanBytes(config.cacheMaxBytes)}</ReadOnlyValue>
          </SettingRow>
          <SettingRow
            description="KEENPIX_MEMORY_CACHE_MAX_BYTES — hot in-memory tier cap"
            label="Memory cache cap"
          >
            <ReadOnlyValue>
              {humanBytes(config.memoryCacheMaxBytes)}
            </ReadOnlyValue>
          </SettingRow>
          <SettingRow
            description="KEENPIX_CACHE_S3_* — shared object-storage (R2/S3) cache tier"
            label="Shared object storage"
          >
            <Badge variant={config.objectStorage ? 'success' : 'outline'}>
              {config.objectStorage ? 'Enabled' : 'Disabled'}
            </Badge>
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cloudflare edge analytics</CardTitle>
          <CardDescription>
            Read-only edge cache hit-rate, sourced from CLOUDFLARE_* environment
            variables. Zone-scoped Analytics → Read token.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SettingRow
            description="Where the effective config resolves from"
            label="Source"
          >
            <Badge variant={cloudflare.source === 'none' ? 'outline' : 'info'}>
              {cloudflare.source}
            </Badge>
          </SettingRow>
          <SettingRow
            description="Whether edge analytics is active"
            label="Status"
          >
            <Badge variant={cloudflare.enabled ? 'success' : 'outline'}>
              {cloudflare.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </SettingRow>
          <SettingRow description="CLOUDFLARE_ZONE_ID" label="Zone">
            <ReadOnlyValue>{cloudflare.zoneId || '—'}</ReadOnlyValue>
          </SettingRow>
          <SettingRow
            description="CLOUDFLARE_HOST — optional image-host filter"
            label="Host filter"
          >
            <ReadOnlyValue>{cloudflare.host || '—'}</ReadOnlyValue>
          </SettingRow>
          <SettingRow description="CLOUDFLARE_API_TOKEN" label="API token">
            <Badge variant={cloudflare.tokenSet ? 'success' : 'outline'}>
              {cloudflare.tokenSet ? 'Configured' : 'Not set'}
            </Badge>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  )
}
