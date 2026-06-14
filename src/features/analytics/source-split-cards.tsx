import { Link } from '@tanstack/react-router'
import { CloudIcon } from 'lucide-react'
import {
  SourceSplitCard,
  type SourceSplitCardProps,
} from '@/components/app/source-split-card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { compactNumber, humanBytes } from '@/shared/format'
import type { AnalyticsSummary, EdgeCacheStats } from '@/shared/types'

// The origin KPI row, re-expressed as "total, then by source". Cloudflare edge
// and keenpix origin are two stages of one request funnel, so the only honest
// place to sum them is the 24h whole-zone window where both layers measure the
// same traffic — that is what `gated` means at the call site. Outside it, the
// edge half doesn't exist, so the cards collapse to origin-only with a dash.

// The fields these cards actually read — narrow enough that both the analytics
// AnalyticsSummary and the dashboard's KPI payload can satisfy it.
type CardSummary = Pick<
  AnalyticsSummary,
  'bandwidthOut' | 'bandwidthSaved' | 'totalRequests' | 'hitRate'
>

// Optional vs-previous-window trends (Overview only). They only attach to cards
// whose displayed value is the origin metric — never to an edge-inclusive total,
// where an origin trend would contradict the number above it.
export interface CardDeltas {
  hitRatePp: number | null
  requests: number | null
  saved: number | null
}

function ratio(part: number, whole: number) {
  return whole === 0 ? 0 : (part / whole) * 100
}

function savedCard(
  summary: CardSummary,
  delta?: number | null,
): SourceSplitCardProps {
  // Compression saving is purely an origin act — the edge offloads egress, it
  // doesn't re-encode — so this never has an edge value, in any window. The sub
  // surfaces how much smaller every delivery was than its origin original:
  // saved / (saved + served).
  const totalOriginal = summary.bandwidthSaved + summary.bandwidthOut
  const savingsPct =
    totalOriginal > 0 ? (summary.bandwidthSaved / totalOriginal) * 100 : 0
  return {
    label: 'Bandwidth saved',
    value: humanBytes(summary.bandwidthSaved, 1),
    sub:
      savingsPct > 0
        ? `${Math.round(savingsPct)}% smaller · compression`
        : 'compression · origin only',
    delta,
    rows: [
      { source: 'none', label: 'Cloudflare edge', value: '—' },
      {
        source: 'origin',
        label: 'keenpix origin',
        value: humanBytes(summary.bandwidthSaved, 1),
      },
    ],
  }
}

function reconciledCards(
  edge: EdgeCacheStats,
  summary: CardSummary,
  deltas?: CardDeltas,
): SourceSplitCardProps[] {
  const deliveredTotal = edge.bytesFromEdge + summary.bandwidthOut
  const edgeBytesPct = ratio(edge.bytesFromEdge, deliveredTotal)
  const reached = edge.requests - edge.cachedRequests
  const edgeReqPct = ratio(edge.cachedRequests, edge.requests)
  // End-to-end hit rate: served at the edge OR from keenpix disk, over all
  // client requests. Disk hits come from the same 24h whole-zone origin window.
  const originDiskHits = Math.round(
    (summary.totalRequests * summary.hitRate) / 100,
  )
  const endToEnd = ratio(edge.cachedRequests + originDiskHits, edge.requests)
  const diskContribution = ratio(originDiskHits, edge.requests)
  return [
    {
      label: 'Bandwidth delivered',
      value: humanBytes(deliveredTotal, 1),
      bar: [
        { source: 'edge', pct: edgeBytesPct },
        { source: 'origin', pct: 100 - edgeBytesPct },
      ],
      rows: [
        {
          source: 'edge',
          label: 'Cloudflare edge',
          value: `${humanBytes(edge.bytesFromEdge, 1)} · ${Math.round(edgeBytesPct)}%`,
        },
        {
          source: 'origin',
          label: 'keenpix origin',
          value: `${humanBytes(summary.bandwidthOut, 1)} · ${Math.round(100 - edgeBytesPct)}%`,
        },
      ],
    },
    {
      label: 'Client requests',
      value: compactNumber(edge.requests),
      bar: [
        { source: 'edge', pct: edgeReqPct },
        { source: 'origin', pct: 100 - edgeReqPct },
      ],
      rows: [
        {
          source: 'edge',
          label: 'Served at edge',
          value: `${compactNumber(edge.cachedRequests)} · ${Math.round(edgeReqPct)}%`,
        },
        {
          source: 'origin',
          label: 'Reached keenpix',
          value: `${compactNumber(reached)} · ${Math.round(100 - edgeReqPct)}%`,
        },
      ],
    },
    {
      label: 'Cache hit rate',
      value: `${endToEnd.toFixed(1)}%`,
      sub: 'end-to-end',
      bar: [
        { source: 'edge', pct: edge.hitRate },
        { source: 'disk', pct: diskContribution },
      ],
      rows: [
        {
          source: 'edge',
          label: 'At Cloudflare edge',
          value: `${edge.hitRate.toFixed(1)}%`,
        },
        {
          source: 'disk',
          label: 'From keenpix disk',
          value: `+${diskContribution.toFixed(1)}%`,
        },
      ],
    },
    savedCard(summary, deltas?.saved),
  ]
}

function originOnlyCards(
  summary: CardSummary,
  deltas?: CardDeltas,
): SourceSplitCardProps[] {
  const dash = { source: 'none', label: 'Cloudflare edge', value: '—' } as const
  return [
    {
      label: 'Bandwidth delivered',
      value: humanBytes(summary.bandwidthOut, 1),
      sub: 'keenpix origin',
      rows: [
        dash,
        {
          source: 'origin',
          label: 'keenpix origin',
          value: humanBytes(summary.bandwidthOut, 1),
        },
      ],
    },
    {
      label: 'Client requests',
      value: compactNumber(summary.totalRequests),
      sub: 'keenpix origin',
      delta: deltas?.requests,
      rows: [
        dash,
        {
          source: 'origin',
          label: 'Reached keenpix',
          value: compactNumber(summary.totalRequests),
        },
      ],
    },
    {
      label: 'Cache hit rate',
      value: `${summary.hitRate.toFixed(1)}%`,
      sub: 'keenpix disk',
      delta: deltas?.hitRatePp,
      deltaUnit: 'pp',
      rows: [
        dash,
        {
          source: 'disk',
          label: 'keenpix disk',
          value: `${summary.hitRate.toFixed(1)}%`,
        },
      ],
    },
    savedCard(summary, deltas?.saved),
  ]
}

export function SourceSplitCards({
  connect,
  deltas,
  edge,
  gated,
  note,
  summary,
}: {
  connect?: boolean
  deltas?: CardDeltas
  edge: EdgeCacheStats | null
  gated: boolean
  note?: string
  summary: CardSummary
}) {
  const cards =
    gated && edge
      ? reconciledCards(edge, summary, deltas)
      : originOnlyCards(summary, deltas)
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <SourceSplitCard key={c.label} {...c} />
        ))}
      </div>
      {connect ? (
        <Alert>
          <CloudIcon />
          <AlertTitle>Connect Cloudflare to see edge delivery</AlertTitle>
          <AlertDescription>
            These cards show only what reached keenpix. Connect Cloudflare to
            split each metric between the edge and the origin and reveal the
            true end-to-end cache hit rate.{' '}
            <Link search={{ section: 'cdn' }} to="/app/settings">
              Connect in Settings → CDN cache
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}
      {note && !connect ? (
        <p className="text-muted-foreground text-xs">{note}</p>
      ) : null}
    </div>
  )
}
