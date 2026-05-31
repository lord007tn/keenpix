import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type DeltaTone = 'success' | 'destructive' | 'warning' | 'info' | 'secondary'

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaDir = 'up',
  deltaTone = 'success',
  sub,
}: {
  label: string
  value: ReactNode
  unit?: string
  delta?: string
  deltaDir?: 'up' | 'down'
  deltaTone?: DeltaTone
  sub?: string
}) {
  const Arrow = deltaDir === 'down' ? ArrowDownIcon : ArrowUpIcon
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
        {delta || sub ? (
          <div className="flex items-center gap-2">
            {delta ? (
              <Badge variant={deltaTone}>
                <Arrow data-icon="inline-start" />
                {delta}
              </Badge>
            ) : null}
            {sub ? (
              <span className="text-muted-foreground text-xs">{sub}</span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
