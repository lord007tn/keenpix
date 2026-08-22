import { Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  FileCheckIcon,
  ScaleIcon,
} from 'lucide-react'
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
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:py-18 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:py-20">
            <div>
              <Badge variant="secondary">Image CDN comparisons</Badge>
              <h1 className="mt-4 max-w-4xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl lg:text-6xl">
                How Keenpix compares — honest, dated numbers
              </h1>
              <p className="mt-5 max-w-3xl text-pretty text-lg text-muted-foreground leading-relaxed sm:text-xl">
                Every comparison states the month its pricing was checked, lists
                where the other vendor genuinely wins, and spells out what
                Keenpix deliberately doesn't do. If we're not the right fit, the
                page says so.
              </p>
            </div>

            <aside
              aria-label="Comparison standards"
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <h2 className="font-semibold text-sm">Every page includes</h2>
              <ul className="mt-4 grid gap-4 text-sm">
                <li className="flex gap-3">
                  <CalendarCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>Dated pricing and a scheduled review</span>
                </li>
                <li className="flex gap-3">
                  <FileCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>Linked vendor sources and assumptions</span>
                </li>
                <li className="flex gap-3">
                  <ScaleIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>Clear cases where the competitor wins</span>
                </li>
              </ul>
            </aside>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <h2 className="font-semibold text-2xl tracking-tight">
                Model your workload before choosing a plan
              </h2>
              <p className="mt-2 max-w-3xl text-muted-foreground leading-relaxed">
                Use the same delivery, request, storage, transform, project,
                domain, and region inputs across nine source-dated provider
                models.
              </p>
            </div>
            <a
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
              href="/image-cdn-cost-calculator"
            >
              Open cost calculator
              <ArrowRightIcon className="size-4" />
            </a>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
            <span className="font-medium text-primary text-sm">
              Compare the right category
            </span>
            <h2 className="mt-2 max-w-3xl text-balance font-semibold text-3xl tracking-tight">
              Start with the product boundary, not the feature count
            </h2>
            <p className="mt-4 max-w-4xl text-muted-foreground leading-relaxed">
              “Image CDN” can mean a full media platform, a managed optimizer
              attached to a CDN, a hosting-platform feature, or a transform
              engine you operate yourself. Those categories overlap, but they do
              not create the same bill or move the same operational work.
              Keenpix is a focused image transformation and delivery layer: it
              does not provide a DAM, source-image library, or video platform.
            </p>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <article className="rounded-xl border bg-card p-6 shadow-sm">
                <span className="font-mono text-primary text-xs">01</span>
                <h3 className="mt-3 font-semibold text-lg">
                  Full media platforms
                </h3>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  Cloudinary and Gumlet are stronger fits when video, DAM,
                  upload workflows, AI media features, or enterprise media
                  operations belong in the same vendor relationship.
                </p>
              </article>
              <article className="rounded-xl border bg-card p-6 shadow-sm">
                <span className="font-mono text-primary text-xs">02</span>
                <h3 className="mt-3 font-semibold text-lg">
                  Managed image delivery
                </h3>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  ImageKit, imgix, Cloudflare Images, Bunny Optimizer, Vercel,
                  Gumlet Image, and Keenpix differ in meters, storage
                  assumptions, integrations, CDN ownership, and transform depth.
                  Model the exact workload instead of one headline rate.
                </p>
              </article>
              <article className="rounded-xl border bg-card p-6 shadow-sm">
                <span className="font-mono text-primary text-xs">03</span>
                <h3 className="mt-3 font-semibold text-lg">
                  Self-hosted engines
                </h3>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  Self-hosting replaces a service fee with infrastructure,
                  delivery, backups, upgrades, capacity planning, abuse
                  controls, and incident response. It is an ownership choice,
                  not a universal cost shortcut.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <h2 className="font-semibold text-2xl tracking-tight">
                How these comparisons are built
              </h2>
              <p className="mt-3 max-w-4xl text-muted-foreground leading-relaxed">
                Each page uses current vendor pricing and documentation,
                discloses that Keenpix benefits if you choose it, states where
                the competitor wins, and carries a verification and next-review
                date. Pricing scenarios are estimates, not quotes, and no page
                substitutes unsupported benchmarks, ratings, or customer proof
                for reproducible evidence.
              </p>
            </div>
            <Link
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border bg-background px-4 font-medium text-sm transition-colors hover:bg-muted"
              to="/methodology/comparisons"
            >
              Read the methodology
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
            <div>
              <span className="font-medium text-primary text-sm">
                Choose a competitor
              </span>
              <h2 className="mt-2 font-semibold text-3xl tracking-tight">
                Read the full comparison
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
                Each page separates pricing, capabilities, trade-offs, and
                migration steps so you can scan the decision in the order that
                matters to you.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {comparisons.map((comparison) => (
                <Link
                  className="group flex min-h-72 flex-col rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-ring/60 hover:bg-muted/40"
                  key={comparison.slug}
                  params={{ slug: comparison.slug }}
                  to="/compare/$slug"
                >
                  <div className="flex items-start justify-between gap-4">
                    <Badge variant="secondary">
                      vs {comparison.competitor}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {comparison.sources.length} sources
                    </span>
                  </div>
                  <h3 className="mt-5 text-balance font-semibold text-xl leading-snug group-hover:text-primary">
                    {comparison.heroHeadline}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-muted-foreground text-sm leading-relaxed">
                    {comparison.heroSubhead}
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Pricing checked</dt>
                      <dd className="mt-1 font-medium">
                        {comparison.pricingAsOf}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Next review</dt>
                      <dd className="mt-1 font-medium">
                        <time dateTime={comparison.nextReviewAt}>
                          {comparison.nextReviewAt}
                        </time>
                      </dd>
                    </div>
                  </dl>
                  <span className="mt-auto flex items-center gap-1 pt-6 font-medium text-primary text-sm">
                    Read the comparison
                    <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-8 text-muted-foreground text-sm">
              Prefer to operate the full stack yourself? See what the{' '}
              <Link
                className="font-medium text-primary underline-offset-4 hover:underline"
                to="/self-hosted-image-cdn"
              >
                self-hosted image CDN
              </Link>{' '}
              includes and what remains your responsibility.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
