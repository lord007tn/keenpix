import { cn } from '@/lib/utils'

/** Keenpix wordmark: the 7-square glyph + name. */
export function KeenpixLogo({
  className,
  showName = true,
}: {
  className?: string
  showName?: boolean
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <svg
        aria-hidden="true"
        className="size-5"
        fill="none"
        viewBox="0 0 14 14"
      >
        <rect fill="var(--primary)" height="3" rx="0.6" width="3" x="0" y="0" />
        <rect
          fill="var(--chart-2)"
          height="3"
          rx="0.6"
          width="3"
          x="5.5"
          y="0"
        />
        <rect
          fill="var(--primary)"
          height="3"
          rx="0.6"
          width="3"
          x="11"
          y="0"
        />
        <rect
          fill="var(--foreground)"
          height="3"
          rx="0.6"
          width="3"
          x="5.5"
          y="5.5"
        />
        <rect
          fill="var(--primary)"
          height="3"
          rx="0.6"
          width="3"
          x="0"
          y="11"
        />
        <rect
          fill="var(--chart-2)"
          height="3"
          rx="0.6"
          width="3"
          x="5.5"
          y="11"
        />
        <rect
          fill="var(--primary)"
          height="3"
          rx="0.6"
          width="3"
          x="11"
          y="11"
        />
      </svg>
      {showName ? (
        <span className="font-semibold tracking-tight">keenpix</span>
      ) : null}
    </span>
  )
}
