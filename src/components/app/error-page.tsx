import {
  type ErrorComponentProps,
  Link,
  useRouter,
} from '@tanstack/react-router'
import { ArrowRightIcon, LogOutIcon, RotateCwIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { Button, buttonVariants } from '@/components/ui/button'
import { signOut } from '@/lib/auth/client'

// Full-chrome shell for standalone (public) error pages: brand mark, theme
// toggle, and centered messaging. App-shell error states render chrome-less
// because the app top nav already provides branding and theme controls.
function ErrorPageShell({ children }: { children: ReactNode }) {
  return (
    <main
      className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 text-center"
      id="main-content"
    >
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <KeenpixLogo />
      {children}
    </main>
  )
}

function ErrorMessage({
  code,
  title,
  description,
}: {
  code: string
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="font-mono font-semibold text-5xl text-muted-foreground/50 tabular-nums tracking-tight">
        {code}
      </p>
      <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
      <p className="max-w-md text-balance text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

// Public 404 — wired as the root route's notFoundComponent, which doubles as
// the router-wide default for any unmatched URL. The router serves it with an
// HTTP 404 status via its not-found match handling.
export function NotFoundPage() {
  return (
    <ErrorPageShell>
      <ErrorMessage
        code="404"
        description="The page you're looking for doesn't exist or may have moved."
        title="Page not found"
      />
      <div className="flex flex-wrap justify-center gap-3">
        <Link className={buttonVariants()} to="/">
          Back to home
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
        <a className={buttonVariants({ variant: 'outline' })} href="/docs">
          Read the docs
        </a>
      </div>
    </ErrorPageShell>
  )
}

// Public 500 — wired as the router's defaultErrorComponent for loader/render
// failures outside the app shell. The router serves a 500 status whenever a
// matched route is in an error state.
export function ServerErrorPage({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <ErrorPageShell>
      <ErrorMessage
        code="500"
        // Never surface a raw server/DB error message to users in production
        // (infra strings leak internals); keep it in dev for debugging.
        description={
          import.meta.env.DEV && error?.message
            ? error.message
            : 'An unexpected error occurred while loading this page.'
        }
        title="Something went wrong"
      />
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => router.invalidate()}>
          <RotateCwIcon data-icon="inline-start" />
          Try again
        </Button>
        <Link className={buttonVariants({ variant: 'outline' })} to="/">
          Back to home
        </Link>
      </div>
    </ErrorPageShell>
  )
}

// Private 404 — wired as the /app layout route's notFoundComponent so unknown
// in-app URLs render inside the authenticated shell (top nav stays put) and
// point back to the dashboard instead of bouncing to the public 404.
export function AppNotFound() {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-5 p-6 text-center">
      <ErrorMessage
        code="404"
        description="We couldn't find that page in your workspace, or you don't have access to it."
        title="Page not found"
      />
      <Link
        className={buttonVariants()}
        search={{ range: '30d' }}
        to="/app/dashboard"
      >
        Go to dashboard
        <ArrowRightIcon data-icon="inline-end" />
      </Link>
    </div>
  )
}

// App 500 — wired as the /app layout route's errorComponent so loader/render
// failures inside the shell show a retry affordance instead of a blank page.
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()

  async function signOutAndRecover() {
    try {
      await signOut()
    } finally {
      window.location.assign('/login')
    }
  }

  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-5 p-6 text-center">
      <ErrorMessage
        code="500"
        description={
          import.meta.env.DEV && error?.message
            ? error.message
            : 'An unexpected error occurred. Try again, or head back to your dashboard.'
        }
        title="Something went wrong"
      />
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => router.invalidate()}>
          <RotateCwIcon data-icon="inline-start" />
          Try again
        </Button>
        <Button onClick={signOutAndRecover} variant="outline">
          <LogOutIcon data-icon="inline-start" />
          Sign out and choose workspace
        </Button>
      </div>
    </div>
  )
}
