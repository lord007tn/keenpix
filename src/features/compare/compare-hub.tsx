import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'
import { COMPARISONS } from './comparison-data'

export function CompareHub() {
  const comparisons = Object.values(COMPARISONS)

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Compare
            </span>
            <h1 className="mt-2 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              How Keenpix compares — honest, dated numbers
            </h1>
            <p className="mt-4 max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed">
              Every comparison states the month its pricing was checked, lists
              where the other vendor genuinely wins, and spells out what Keenpix
              deliberately doesn't do. If we're not the right fit, the page says
              so.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-5xl px-6 py-14">
            <div className="grid gap-4 md:grid-cols-2">
              {comparisons.map((comparison) => (
                <Link
                  className="group flex flex-col gap-3 rounded-lg border bg-card p-6 transition-colors hover:border-ring/60 hover:bg-muted/40"
                  key={comparison.slug}
                  params={{ slug: comparison.slug }}
                  to="/compare/$slug"
                >
                  <div>
                    <Badge variant="secondary">
                      vs {comparison.competitor}
                    </Badge>
                  </div>
                  <h2 className="text-balance font-semibold text-lg leading-snug group-hover:text-primary">
                    {comparison.heroHeadline}
                  </h2>
                  <p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
                    {comparison.heroSubhead}
                  </p>
                  <div className="mt-auto flex items-center gap-1 pt-1 font-medium text-primary text-sm">
                    Read the comparison
                    <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
