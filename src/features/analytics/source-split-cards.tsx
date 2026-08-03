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
// edge half doesn't exist, so the cards collapse to Keenpix-only rows.

// The fields these cards actually read — narrow enough that both the analytics
// AnalyticsSummary and the dashboard's KPI payload can satisfy it.
type CardSummary = Pick<
  AnalyticsSummary,
  | 'bandwidthOut'
  | 'bandwidthSaved'
  | 'cacheHits'
  | 'failedRequests'
  | 'hitRate'
  | 'liveOptimizations'
  | 'successfulDeliveries'
  | 'totalRequests'
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
  edgeBytesFromEdge?: number,
): SourceSplitCardProps {
  // The sub surfaces how much smaller every delivery was than its origin
  // original: saved / (saved + served).
  const totalOriginal = summary.bandwidthSaved + summary.bandwidthOut
  const savingsPct =
    totalOriginal > 0 ? (summary.bandwidthSaved / totalOriginal) * 100 : 0
  // keenpix never sees a Cloudflare cache hit, so it can't *measure* the
  // compression saving on edge-served bytes. But the edge serves the same
  // optimized variants, so we estimate it by applying the origin's measured
  // savings ratio (bytesSaved / bytesOut) to the edge-delivered bytes. Estimate,
  // not measured — flagged "est." in the row and excluded from the trend.
  const hasEdge = edgeBytesFromEdge != null
  const edgeSaved =
    hasEdge && summary.bandwidthOut > 0
      ? edgeBytesFromEdge * (summary.bandwidthSaved / summary.bandwidthOut)
      : 0
  const total = summary.bandwidthSaved + edgeSaved
  return {
    label: 'Bandwidth saved',
    value: humanBytes(total, 1),
    sub:
      savingsPct > 0
        ? `${Math.round(savingsPct)}% smaller · compression`
        : 'compression · origin only',
    // The trend only attaches to an origin-measured headline; the edge-inclusive
    // total mixes in an estimate, so it carries no vs-previous delta.
    delta: hasEdge ? undefined : delta,
    bar: hasEdge
      ? [
          { source: 'edge', pct: ratio(edgeSaved, total) },
          { source: 'origin', pct: ratio(summary.bandwidthSaved, total) },
        ]
      : undefined,
    rows: [
      ...(hasEdge
        ? [
            {
              source: 'edge',
              label: 'Edge',
              value: `~${humanBytes(edgeSaved, 1)} · est.`,
            } as const,
          ]
        : []),
      {
        source: 'origin',
        label: 'Keenpix compression',
        value: humanBytes(summary.bandwidthSaved, 1),
      },
    ],
  }
}

export function reconciledCards(
  edge: EdgeCacheStats,
  summary: CardSummary,
  deltas?: CardDeltas,
): SourceSplitCardProps[] {
  const deliveredTotal = edge.bytesFromEdge + summary.bandwidthOut
  const edgeBytesPct = ratio(edge.bytesFromEdge, deliveredTotal)
  // Cloudflare hits never reach Keenpix. The truthful end-to-end total is the
  // edge-optimized requests plus every request recorded at the origin. The
  // visible stage rows then add back to this headline exactly.
  const clientRequests = edge.cachedRequests + summary.totalRequests
  const edgeReqPct = ratio(edge.cachedRequests, clientRequests)
  const cacheContribution = ratio(summary.cacheHits, clientRequests)
  const optimizedContribution = ratio(summary.liveOptimizations, clientRequests)
  const endToEnd = ratio(
    edge.cachedRequests + summary.cacheHits,
    clientRequests,
  )
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
          label: 'Edge',
          value: `${humanBytes(edge.bytesFromEdge, 1)} · ${Math.round(edgeBytesPct)}%`,
        },
        {
          source: 'origin',
          label: 'Keenpix delivery',
          value: `${humanBytes(summary.bandwidthOut, 1)} · ${Math.round(100 - edgeBytesPct)}%`,
        },
      ],
    },
    {
      label: 'Image requests',
      value: compactNumber(clientRequests),
      sub: `${compactNumber(edge.cachedRequests + summary.successfulDeliveries)} delivered`,
      bar: [
        { source: 'edge', pct: edgeReqPct },
        { source: 'disk', pct: cacheContribution },
        { source: 'live', pct: optimizedContribution },
      ],
      rows: [
        {
          source: 'edge',
          label: 'Edge',
          value: `${compactNumber(edge.cachedRequests)} · ${Math.round(edgeReqPct)}%`,
        },
        {
          source: 'disk',
          label: 'Cache optimized',
          value: `${compactNumber(summary.cacheHits)} · ${Math.round(cacheContribution)}%`,
        },
        {
          source: 'live',
          label: 'Optimized',
          value: `${compactNumber(summary.liveOptimizations)} · ${Math.round(optimizedContribution)}%`,
        },
      ],
    },
    {
      label: 'Cache hit rate',
      value: `${endToEnd.toFixed(1)}%`,
      sub: 'end-to-end',
      bar: [
        { source: 'edge', pct: edgeReqPct },
        { source: 'disk', pct: cacheContribution },
      ],
      rows: [
        {
          source: 'edge',
          label: 'Edge',
          value: `${edgeReqPct.toFixed(1)}%`,
        },
        {
          source: 'disk',
          label: 'Cache optimized',
          value: `+${cacheContribution.toFixed(1)}%`,
        },
      ],
    },
    savedCard(summary, deltas?.saved, edge.bytesFromEdge),
  ]
}

function originOnlyCards(
  summary: CardSummary,
  deltas?: CardDeltas,
): SourceSplitCardProps[] {
  // Of everything that reached keenpix, the split between disk-cache hits and
  // fresh optimizes.
  const diskHits = summary.cacheHits
  const liveServed = summary.liveOptimizations
  return [
    {
      label: 'Bandwidth delivered',
      value: humanBytes(summary.bandwidthOut, 1),
      sub: 'Keenpix delivery',
      rows: [
        {
          source: 'origin',
          label: 'Keenpix delivery',
          value: humanBytes(summary.bandwidthOut, 1),
        },
      ],
    },
    {
      label: 'Image requests',
      value: compactNumber(summary.totalRequests),
      sub: `${compactNumber(summary.successfulDeliveries)} delivered`,
      delta: deltas?.requests,
      bar: [
        { source: 'disk', pct: summary.hitRate },
        { source: 'live', pct: 100 - summary.hitRate },
      ],
      rows: [
        {
          source: 'disk',
          label: 'Cache optimized',
          value: `${compactNumber(diskHits)} · ${Math.round(summary.hitRate)}%`,
        },
        {
          source: 'live',
          label: 'Optimized',
          value: `${compactNumber(liveServed)} · ${Math.round(100 - summary.hitRate)}%`,
        },
      ],
    },
    {
      label: 'Cache hit rate',
      value: `${summary.hitRate.toFixed(1)}%`,
      sub: 'Keenpix cache',
      delta: deltas?.hitRatePp,
      deltaUnit: 'pp',
      rows: [
        {
          source: 'disk',
          label: 'Cache optimized',
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
  note,
  preparing,
  ready,
  summary,
}: {
  connect?: boolean
  deltas?: CardDeltas
  edge: EdgeCacheStats | null
  note?: string
  preparing?: boolean
  ready: boolean
  summary: CardSummary
}) {
  // While the (separate, session-cached) edge query is still loading, the cards
  // show origin-only and upgrade to the reconciled edge+origin split once it
  // lands — no skeleton.
  let cards = originOnlyCards(summary, deltas)
  if (ready && edge) {
    cards = reconciledCards(edge, summary, deltas)
  }
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
            These cards show only what reached keenpix. Set the CLOUDFLARE_* env
            vars to split each metric between the edge and the origin and reveal
            the true end-to-end cache hit rate.{' '}
            <Link to="/admin/settings">View in Admin → Settings</Link>
          </AlertDescription>
        </Alert>
      ) : null}
      {preparing && !connect ? (
        <span
          aria-live="polite"
          className="flex items-center gap-1.5 text-muted-foreground text-xs"
        >
          Preparing Cloudflare edge data
          <span className="flex items-center gap-1">
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-300ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-150ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current" />
          </span>
        </span>
      ) : null}
      {note && !connect && !preparing ? (
        <p className="text-muted-foreground text-xs">{note}</p>
      ) : null}
    </div>
  )
}
