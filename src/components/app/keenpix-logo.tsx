import { cn } from '@/lib/utils'

export function KeenpixLogo({
  className,
  showName = true,
}: {
  className?: string
  showName?: boolean
}) {
  return (
    <span className={cn('flex items-center gap-2.5 leading-none', className)}>
      <span className="flex size-8 items-center justify-center overflow-hidden rounded-md bg-background shadow-sm ring-1 ring-border">
        <img
          alt=""
          aria-hidden="true"
          className="size-full object-cover"
          height="32"
          src="/logo192.png"
          width="32"
        />
      </span>
      {showName ? (
        <span className="font-semibold tracking-tight">Keenpix</span>
      ) : (
        <span className="sr-only">Keenpix</span>
      )}
    </span>
  )
}
