import type { ReactNode } from 'react'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'

// Shared chrome + typography for the legal pages (Terms, Privacy, DPA, License).
// Self-contained prose styling via arbitrary variants so it needs no extra
// stylesheet.
export function LegalLayout({
  children,
  lastUpdated,
  title,
}: {
  children: ReactNode
  lastUpdated: string
  title: string
}) {
  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
          <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Last updated {lastUpdated}
          </p>
          <div className="mt-8 flex flex-col gap-4 [&_a]:text-primary [&_a]:underline [&_h2]:mt-8 [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:text-xl [&_h2]:tracking-tight [&_li]:mt-1 [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground">
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
