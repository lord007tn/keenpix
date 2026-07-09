import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

// Compact KPI tile: a muted label, a large tabular value, and an optional
// sub-line. Shared across the operator dashboards and customer detail.
export function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: ReactNode
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="font-semibold text-2xl tabular-nums">{value}</span>
        {sub ? (
          <span className="text-muted-foreground text-xs">{sub}</span>
        ) : null}
      </CardContent>
    </Card>
  )
}
