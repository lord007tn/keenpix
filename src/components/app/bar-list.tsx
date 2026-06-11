import type { TopItem } from '@/shared/types'

export function BarList({
  data,
  barColor = 'var(--chart-1)',
  valueFormat = (v: number) => String(v),
}: {
  data: TopItem[]
  barColor?: string
  valueFormat?: (v: number) => string
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {data.map((d) => (
        <div
          className="relative flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-md px-2 py-1.5"
          key={d.label}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-md"
            style={{
              width: `${(d.value / max) * 100}%`,
              background: `color-mix(in oklab, ${barColor} 16%, transparent)`,
            }}
          />
          <span className="relative min-w-0 flex-1 truncate font-mono text-xs">
            {d.label}
          </span>
          <span className="relative shrink-0 text-muted-foreground text-xs tabular-nums">
            {valueFormat(d.value)}
          </span>
        </div>
      ))}
    </div>
  )
}
