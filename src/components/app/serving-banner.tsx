import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { TriangleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getBillingStateFn } from '@/functions/billing'

const SERVING = new Set(['active', 'trialing', 'internal'])
const GRACE = new Set(['past_due', 'unpaid'])

// Cloud-only: surfaces a subscription / serving problem in the app shell so a
// customer whose images are all returning 402 isn't left guessing why. Reuses
// the shared billing-state query (cached), so it's one extra request per load.
export function ServingBanner({ cloud }: { cloud: boolean }) {
  const { data } = useQuery({
    enabled: cloud,
    queryFn: () => getBillingStateFn(),
    queryKey: ['billing-state'],
    staleTime: 30_000,
  })
  if (!(cloud && data)) {
    return null
  }

  const { status } = data
  const capReached =
    data.spendCapCents !== null &&
    data.usage.overageCostCents >= data.spendCapCents
  const grace = status !== null && GRACE.has(status)
  // Had a subscription that has ended (canceled/revoked/…). A never-subscribed
  // org (status null) is just exploring, so it gets no alarming banner.
  const ended = status !== null && !SERVING.has(status) && !grace

  if (!(capReached || grace || ended)) {
    return null
  }

  let title = 'Payment issue — update your billing'
  let body =
    'Your last payment didn’t go through. Image delivery continues for now but will stop if billing isn’t brought current.'
  if (capReached) {
    title = 'Image delivery paused — spending cap reached'
    body =
      'You’ve hit the overage spending cap for this period, so images are no longer being served. Raise or remove the cap to resume.'
  } else if (ended) {
    title = 'Image delivery stopped — no active subscription'
    body =
      'Your subscription has ended, so images are no longer being served. Resubscribe to resume delivery.'
  }

  return (
    <div className="px-3 pt-3 sm:px-4">
      <Alert variant={grace && !capReached ? 'default' : 'destructive'}>
        <TriangleAlertIcon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          {body}
          <Link
            className="font-medium underline"
            search={{ section: 'billing' }}
            to="/app/settings"
          >
            Go to billing
          </Link>
        </AlertDescription>
      </Alert>
    </div>
  )
}
