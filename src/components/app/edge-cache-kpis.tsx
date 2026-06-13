import { CloudIcon } from 'lucide-react'
import { StatCard } from '@/components/app/stat-card'
import { compactNumber, humanBytes } from '@/shared/format'
import type { EdgeCacheStats } from '@/shared/types'

// Cloudflare edge KPIs (last 24h). Deliberately a separate, labelled layer from
// the keenpix origin KPIs: edge hits never reach the app, and the adaptive
// dataset is capped at a 24h window, so these numbers do not share the
// dashboard's range. Shared by the dashboard and analytics pages.
export function EdgeCacheKpis({ edge }: { edge: EdgeCacheStats }) {
  const [bwValue, bwUnit] = humanBytes(edge.bytesFromEdge, 1).split(' ')
  const toOrigin = edge.requests - edge.cachedRequests
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <CloudIcon className="size-4" />
        <h2 className="font-medium text-foreground text-sm">Cloudflare edge</h2>
        <span className="text-xs">last {edge.windowHours}h · whole zone</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Edge hit rate"
          sub="served at the edge"
          tooltip={
            <div className="flex flex-col gap-0.5">
              <span>
                {compactNumber(edge.cachedRequests)} served from Cloudflare
                cache
              </span>
              <span>{compactNumber(toOrigin)} missed and reached keenpix</span>
            </div>
          }
          unit="%"
          value={edge.hitRate.toFixed(1)}
        />
        <StatCard
          label="Edge requests"
          sub="absorbed before origin"
          unit="reqs"
          value={compactNumber(edge.requests)}
        />
        <StatCard
          label="Served from edge"
          sub="origin bandwidth offload"
          unit={bwUnit}
          value={bwValue}
        />
      </div>
    </section>
  )
}
