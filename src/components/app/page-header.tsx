import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? (
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        {subtitle ? (
          <div className="text-muted-foreground text-sm">{subtitle}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
