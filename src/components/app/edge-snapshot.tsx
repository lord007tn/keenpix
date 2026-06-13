import { Link } from '@tanstack/react-router'
import { CloudIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { compactNumber, humanBytes } from '@/shared/format'
import type { EdgeSnapshot as EdgeSnapshotData } from '@/shared/types'

function Stat({
  label,
  value,
  sub,
  dot,
}: {
  label: string
  value: string
  sub: string
  dot?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {dot ? (
          <span className="size-2 rounded-[2px]" style={{ background: dot }} />
        ) : null}
        {label}
      </span>
      <span className="font-semibold text-lg tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">{sub}</span>
    </div>
  )
}

// The Overview's complete top-line: how the last 24h of traffic was delivered,
// across the Cloudflare edge and keenpix. The full funnel/breakdown is on the
// analytics page. Degrades to a connect CTA when Cloudflare isn't wired up.
export function EdgeSnapshot({
  configured,
  data,
}: {
  configured: boolean
  data: EdgeSnapshotData | null
}) {
  if (!data) {
    return (
      <Alert>
        <CloudIcon />
        <AlertTitle>
          {configured
            ? 'Cloudflare edge unavailable'
            : 'Connect Cloudflare to see edge delivery'}
        </AlertTitle>
        <AlertDescription>
          {configured ? (
            "Couldn't load edge data — check the token in Settings → CDN cache."
          ) : (
            <>
              See how much traffic is served at the edge before it reaches
              keenpix.{' '}
              <Link search={{ section: 'cdn' }} to="/app/settings">
                Connect in Settings → CDN cache
              </Link>
            </>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  const edgePct =
    data.requests === 0 ? 0 : (data.servedAtEdge / data.requests) * 100

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">Edge delivery</CardTitle>
          <CardDescription>
            Across Cloudflare edge and keenpix · last {data.windowHours}h ·
            whole zone
          </CardDescription>
        </div>
        <Link
          className="whitespace-nowrap text-muted-foreground text-xs hover:text-foreground"
          search={{ range: '24h' }}
          to="/app/analytics"
        >
          Full funnel →
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-3xl tabular-nums tracking-tight">
              {data.endToEnd.toFixed(1)}%
            </span>
            <span className="text-muted-foreground text-sm">
              end-to-end cache efficiency · served without a re-encode
            </span>
          </div>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
            <div
              style={{ width: `${edgePct}%`, background: 'var(--chart-1)' }}
            />
            <div
              style={{
                width: `${100 - edgePct}%`,
                background: 'var(--chart-2)',
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            dot="var(--chart-1)"
            label="Served at edge"
            sub={`${Math.round(edgePct)}% of client requests`}
            value={compactNumber(data.servedAtEdge)}
          />
          <Stat
            dot="var(--chart-2)"
            label="Reached keenpix"
            sub={`${Math.round(100 - edgePct)}% · ${compactNumber(data.requests)} total`}
            value={compactNumber(data.reachedKeenpix)}
          />
          <Stat
            label="Bandwidth offloaded"
            sub="origin egress avoided"
            value={humanBytes(data.bytesOffloaded, 1)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
