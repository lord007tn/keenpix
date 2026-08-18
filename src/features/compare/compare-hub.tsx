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

        <section className="border-b">
          <div className="mx-auto max-w-5xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Start with the product boundary, not the feature count
            </h2>
            <p className="mt-4 max-w-3xl text-muted-foreground leading-relaxed">
              “Image CDN” can mean a full media platform, a managed optimizer
              attached to a CDN, a hosting-platform feature, or a transform
              engine you operate yourself. Those categories overlap, but they do
              not create the same bill or move the same operational work.
              Keenpix is a focused image transformation and delivery layer: it
              does not provide a DAM, source-image library, or video platform.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-5">
                <h3 className="font-semibold">Full media platforms</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  Cloudinary and Gumlet are stronger fits when video, DAM,
                  upload workflows, AI media features, or enterprise media
                  operations belong in the same vendor relationship.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-5">
                <h3 className="font-semibold">Managed image delivery</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  ImageKit, imgix, Cloudflare Images, Bunny Optimizer, Vercel,
                  Gumlet Image, and Keenpix differ in meters, storage
                  assumptions, integrations, CDN ownership, and transform depth.
                  Model the exact workload instead of one headline rate.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-5">
                <h3 className="font-semibold">Self-hosted engines</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  Self-hosting replaces a service fee with infrastructure,
                  delivery, backups, upgrades, capacity planning, abuse
                  controls, and incident response. It is an ownership choice,
                  not a universal cost shortcut.
                </p>
              </div>
            </div>
            <div className="mt-8 rounded-lg border bg-muted/30 p-5">
              <h3 className="font-semibold">How these comparisons are built</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                Each page uses current vendor pricing and documentation,
                discloses that Keenpix benefits if you choose it, states where
                the competitor wins, and carries a verification and next-review
                date. Pricing scenarios are estimates, not quotes, and no page
                substitutes unsupported benchmarks, ratings, or customer proof
                for reproducible evidence.
              </p>
              <Link
                className="mt-3 inline-flex font-medium text-primary text-sm hover:underline"
                to="/methodology/comparisons"
              >
                Read the comparison and corrections methodology
              </Link>
            </div>
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
