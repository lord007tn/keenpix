import { Card, CardContent } from '@/components/ui/card'

// A KPI card whose headline is the combined total, with an inline
// Cloudflare-edge vs keenpix-origin breakdown beneath it. Additive metrics get
// a real split + mini bar; a 'none' row renders a muted dash so the card itself
// shows which metrics the edge cannot measure.
export type SplitSource = 'edge' | 'origin' | 'disk' | 'none'

export interface SplitRow {
  label: string
  source: SplitSource
  value: string
}

export interface SourceSplitCardProps {
  bar?: Array<{ source: SplitSource; pct: number }>
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
  none: 'var(--border)',
}

export function SourceSplitCard({
  label,
  value,
  unit,
  sub,
  bar,
  rows,
}: SourceSplitCardProps) {
  return (
    <Card className="gap-0">
      <CardContent className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="font-semibold text-2xl tabular-nums tracking-tight">
            {value}
          </span>
          {unit ? (
            <span className="text-muted-foreground text-sm">{unit}</span>
          ) : null}
        </div>
        {sub ? (
          <span className="text-muted-foreground text-xs">{sub}</span>
        ) : null}
        {bar && bar.length > 0 ? (
          <div className="mt-1 flex h-1.5 gap-0.5">
            {bar.map((s) => (
              <div
                className="rounded-[2px]"
                key={s.source}
                style={{
                  width: `${s.pct}%`,
                  background: SOURCE_COLOR[s.source],
                }}
              />
            ))}
          </div>
        ) : null}
        <div className="mt-1 flex flex-col gap-1 border-t pt-2">
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
