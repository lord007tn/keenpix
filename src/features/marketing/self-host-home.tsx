import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { buttonVariants } from '@/components/ui/button'

export function SelfHostHome() {
  return (
    <div
      className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 text-center"
      id="main-content"
    >
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <KeenpixLogo />
      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl tracking-tight">
          Self-hosted Keenpix
        </h1>
        <p className="max-w-md text-balance text-muted-foreground">
          This is a private, self-hosted image-optimization instance. Sign in to
          manage your projects and analytics.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link className={buttonVariants()} to="/app">
          Go to dashboard
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
        <a className={buttonVariants({ variant: 'outline' })} href="/docs">
          Read docs
        </a>
      </div>
      <p className="text-muted-foreground text-xs">
        Prefer not to run it yourself? A managed cloud is available at{' '}
        <a
          className="underline underline-offset-2"
          href="https://keenpix.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          keenpix.com
        </a>
        .
      </p>
    </div>
  )
}
