import { Spinner } from '@/components/ui/spinner'

// A quiet inline marker shown next to the range controls while a background
// revalidation is in flight (stale data still on screen). Replaces the old
// full-page skeleton: data stays visible, this just says it's updating.
export function RefreshingIndicator({ active }: { active: boolean }) {
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
