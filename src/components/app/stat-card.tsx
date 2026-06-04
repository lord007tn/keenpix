import { ArrowDownIcon, ArrowUpIcon, InfoIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type DeltaTone = 'success' | 'destructive' | 'warning' | 'info' | 'secondary'

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaDir = 'up',
  deltaTone = 'success',
  sub,
  tooltip,
}: {
  label: string
  value: ReactNode
  unit?: string
  delta?: string
  deltaDir?: 'up' | 'down'
  deltaTone?: DeltaTone
  sub?: string
  tooltip?: ReactNode
}) {
  const Arrow = deltaDir === 'down' ? ArrowDownIcon : ArrowUpIcon
  return (
    <Card className="gap-0">
      <CardContent className="flex flex-col gap-2">
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="flex w-fit cursor-help items-center gap-1 font-medium text-muted-foreground text-xs uppercase tracking-wider" />
              }
            >
              {label}
              <InfoIcon className="size-3" />
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            {label}
          </span>
        )}
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
