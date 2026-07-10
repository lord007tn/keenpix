import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { buttonVariants } from '@/components/ui/button'
import { SOCIAL_X_URL } from '@/shared/authors'
import { REPOSITORY_URL } from '@/shared/repository'

// Page-agnostic marketing chrome shared by the blog surface. Links resolve to
// absolute paths (not in-page anchors) so they work from any /blog route.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-6">
        <a aria-label="Keenpix home" href="/">
          <KeenpixLogo />
        </a>
        <nav className="ml-4 hidden gap-5 text-muted-foreground text-sm md:flex">
          <a className="hover:text-foreground" href="/#product">
            Product
          </a>
          <a className="hover:text-foreground" href="/pricing">
            Pricing
          </a>
          <a className="hover:text-foreground" href="/blog">
            Blog
          </a>
          <a className="hover:text-foreground" href="/docs">
            Docs
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <Link
            className={buttonVariants({
              className: 'hidden sm:inline-flex',
              size: 'sm',
              variant: 'ghost',
            })}
            to="/login"
          >
            Sign in
          </Link>
          <Link className={buttonVariants({ size: 'sm' })} to="/signup">
            Get started
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-muted-foreground text-sm sm:flex-row">
        <KeenpixLogo />
        <span className="font-mono text-xs">
          © 2026 keenpix · managed cloud + open-source self-host
        </span>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a className="hover:text-foreground" href="/about">
            About
          </a>
          <a className="hover:text-foreground" href="/pricing">
            Pricing
          </a>
          <a className="hover:text-foreground" href="/compare">
            Compare
          </a>
          <a className="hover:text-foreground" href="/changelog">
            Changelog
          </a>
          <a className="hover:text-foreground" href="/docs">
            Documentation
          </a>
          <a className="hover:text-foreground" href="/legal/terms">
            Terms
          </a>
          <a className="hover:text-foreground" href="/legal/privacy">
            Privacy
          </a>
          <a className="hover:text-foreground" href="/legal/license">
            License
          </a>
          <a
            className="hover:text-foreground"
            href={REPOSITORY_URL}
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <a
            className="hover:text-foreground"
            href={SOCIAL_X_URL}
            rel="noreferrer"
            target="_blank"
          >
            X
          </a>
        </nav>
      </div>
    </footer>
  )
}
