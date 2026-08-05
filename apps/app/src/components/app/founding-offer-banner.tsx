import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { PlanPricing } from '@/lib/billing/plans'
import { cn } from '@/lib/cn/utils'

export function FoundingOfferBanner({
  offer,
  compact = false,
}: {
  offer: PlanPricing['foundingOffer']
  compact?: boolean
}) {
  if (!offer.active) {
    return null
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-primary/25 bg-primary/[0.045]',
        compact ? 'px-4 py-3' : 'px-5 py-4 sm:px-6',
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Founding pricing</Badge>
            <span className="font-semibold text-sm tabular-nums">
              {offer.remaining} of {offer.limit} spots left
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-relaxed">
            The first {offer.limit} paying organizations receive today’s price
            for at least 12 months. Trials and complimentary admin grants do not
            consume a spot, and claimed spots never reopen after churn. Standard
            prices will be $9, $29, and $69 per month.
          </p>
        </div>
        <div className="w-full shrink-0 sm:w-44">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Claimed</span>
            <span className="font-medium tabular-nums">
              {offer.claimed}/{offer.limit}
            </span>
          </div>
          <Progress value={(offer.claimed / offer.limit) * 100} />
        </div>
      </div>
    </div>
  )
}
