export function PercentileStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`font-medium text-xs uppercase tracking-wider ${tone}`}>
        {label}
      </span>
      <span className="font-semibold text-xl tabular-nums">
        {value}
        <span className="ml-0.5 text-muted-foreground text-xs">ms</span>
      </span>
    </div>
  )
}
