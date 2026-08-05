import { TriangleAlertIcon } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

// A quiet inline marker shown next to the range controls while a background
// revalidation is in flight (stale data still on screen). Replaces the old
// full-page skeleton: data stays visible, this just says it's updating. When a
// background refresh FAILS (stale data still shown), it says so instead of
// silently leaving the last data with no signal.
export function RefreshingIndicator({
  active,
  error,
}: {
  active: boolean
  error?: boolean
}) {
  if (error) {
    return (
      <span
        aria-live="polite"
        className="flex items-center gap-1.5 text-warning-text text-xs"
      >
        <TriangleAlertIcon className="size-3.5" />
        Couldn’t refresh — showing last loaded data
      </span>
    )
  }
  if (!active) {
    return null
  }
  return (
    <span
      aria-live="polite"
      className="flex items-center gap-1.5 text-muted-foreground text-xs"
    >
      <Spinner aria-label="Refreshing" className="size-3.5" />
      Refreshing…
    </span>
  )
}
