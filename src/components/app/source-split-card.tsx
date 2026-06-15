import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

// A KPI card whose headline is the combined total, with an inline
// Cloudflare-edge vs keenpix-origin breakdown beneath it. Additive metrics get
// a real split + mini bar; a 'none' row renders a muted dash so the card itself
// shows which metrics the edge cannot measure.
export type SplitSource = 'edge' | 'origin' | 'disk' | 'live' | 'none'

export interface SplitRow {
  label: string
  source: SplitSource
  value: string
}

export interface SourceSplitCardProps {
  bar?: Array<{ source: SplitSource; pct: number }>
  // Trend vs the previous window; undefined hides the badge, null shows "New".
  delta?: number | null
  deltaUnit?: string
  label: string
  rows: SplitRow[]
  sub?: string
  unit?: string
  value: string
}

const SOURCE_COLOR: Record<SplitSource, string> = {
  edge: 'var(--chart-1)',
  origin: 'var(--chart-2)',
  disk: 'var(--chart-2)',
  // Optimized-live (origin processed a fresh transform) — matches the funnel
  // chart's "Optimized live" band.
  live: 'var(--muted-foreground)',
  none: 'var(--border)',
}

function Trend({ delta, unit }: { delta: number | null; unit: string }) {
  if (delta === null) {
    return <Badge variant="outline">New</Badge>
  }
  const up = delta >= 0
  const Icon = up ? ArrowUpIcon : ArrowDownIcon
  return (
    <Badge variant="outline">
      <Icon data-icon="inline-start" />
      {up ? '+' : ''}
      {delta.toFixed(1)}
      {unit}
    </Badge>
  )
}

export function SourceSplitCard({
  bar,
  delta,
  deltaUnit = '%',
  label,
  rows,
  sub,
  unit,
  value,
}: SourceSplitCardProps) {
  return (
    <Card className="gap-0">
      <CardContent className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            {label}
          </span>
          {delta === undefined ? null : (
            <Trend delta={delta} unit={deltaUnit} />
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-semibold text-2xl tabular-nums tracking-tight">
            {value}
          </span>
          {unit ? (
            <span className="text-muted-foreground text-sm">{unit}</span>
          ) : null}
        </div>
        {/* Always reserve one line for the sub so the proportion bar starts at
            the same height in every card, with or without a sub. */}
        <span className="min-h-4 text-muted-foreground text-xs">{sub}</span>
        {/* Top-anchored under the value — and a reserved empty slot when a card
            has no bar — so every card's bar lines up across the row regardless of
            how many legend rows it carries. */}
        <div className="flex h-1.5 gap-0.5">
          {bar?.map((s) => (
            <div
              className="rounded-[2px]"
              key={s.source}
              style={{
                width: `${Math.min(100, s.pct)}%`,
                background: SOURCE_COLOR[s.source],
              }}
            />
          ))}
        </div>
        {/* Legend pinned to the card bottom (mt-auto) so the keys bottom-align
            across cards even when row counts differ; the slack sits between the
            bar and the legend. */}
        <div className="mt-auto flex flex-col gap-1 border-t pt-2">
          {rows.map((r) => (
            <div className="flex items-center gap-2 text-xs" key={r.label}>
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: SOURCE_COLOR[r.source] }}
              />
              <span className="flex-1 text-muted-foreground">{r.label}</span>
              <span
                className={
                  r.source === 'none'
                    ? 'text-muted-foreground tabular-nums'
                    : 'font-medium tabular-nums'
                }
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
