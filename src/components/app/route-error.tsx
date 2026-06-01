import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

// Used by app routes and the router default so loader/render failures show a
// retry affordance instead of leaving the user on a blank page.
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
