import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/**
 * Recoverable error surface for route loader/render faults. Wired as the /app
 * `errorComponent` and the router-wide `defaultErrorComponent`, so a failed
 * Prisma query or render throw shows a retry affordance instead of a blank page.
 */
export function RouteError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <main className="flex min-h-[60svh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-semibold text-2xl">Something went wrong</h1>
        <p className="max-w-md text-muted-foreground text-sm">
          {error?.message || 'An unexpected error occurred.'}
        </p>
      </div>
      <Button onClick={() => router.invalidate()}>Try again</Button>
    </main>
  )
}
