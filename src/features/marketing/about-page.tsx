import { ArrowRightIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'
import { FOUNDER, SOCIAL_X_URL, SUPPORT_EMAIL } from '@/shared/authors'
import { REPOSITORY_URL } from '@/shared/repository'

const BELIEFS = [
  {
    title: 'Bill for value, not implementation details',
    body: 'You pay for optimized bytes delivered through managed cloud, counted once from edge to client — never per transform, request, or team member and never through a pooled credit meter.',
  },
  {
    title: 'No lock-in, ever',
    body: 'The exact engine behind the managed cloud is open source under AGPL. Point Keenpix at your existing origin, keep your URLs, and move to self-host whenever you want.',
  },
  {
    title: 'Transparency by default',
    body: 'One published overage rate and built-in analytics that show bandwidth, projected charges, and bytes saved per project. Paid delivery remains online as usage grows.',
  },
]

export function AboutPage() {
  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              About
            </span>
            <h1 className="mt-2 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              The honest image CDN.
            </h1>
            <p className="mt-4 max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed">
              Keenpix optimizes and delivers your images in modern formats from
              a single URL — with published application-bandwidth pricing and an
              open-source engine you can run yourself. We build it because image
              delivery should be fast, cheap, and impossible to get locked into.
            </p>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              What we believe
            </h2>
            <div className="mt-8 flex flex-col gap-6">
              {BELIEFS.map((belief) => (
                <div className="border-border border-l pl-4" key={belief.title}>
                  <h3 className="font-semibold">{belief.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {belief.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Verify the product before you trust it
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Keenpix does not publish customer counts, uptime percentages,
              certifications, or benchmark results until the underlying evidence
              can be inspected. Start with the public source, current release
              history, security model, service-status guidance, and editorial
              method below.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { href: '/security', label: 'Security and data handling' },
                { href: '/status', label: 'Service status and incidents' },
                { href: '/support', label: 'Support and corrections' },
                {
                  href: '/methodology/comparisons',
                  label: 'Comparison methodology',
                },
                { href: '/changelog', label: 'Product changelog' },
                { href: '/legal/dpa', label: 'Data processing agreement' },
              ].map((item) => (
                <a
                  className="rounded-lg border bg-card p-4 font-medium text-sm hover:border-ring/60"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Who's behind Keenpix
            </h2>
            <div className="mt-8 rounded-lg border bg-card p-6">
              <div className="font-semibold text-lg">{FOUNDER.name}</div>
              {FOUNDER.role ? (
                <div className="mt-1 text-muted-foreground text-sm">
                  {FOUNDER.role}
                </div>
              ) : null}
              {FOUNDER.bio ? (
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {FOUNDER.bio}
                </p>
              ) : null}
              <a
                className="mt-4 inline-flex items-center gap-1 font-medium text-primary text-sm hover:underline"
                href={SOCIAL_X_URL}
                rel="author noreferrer"
                target="_blank"
              >
                Follow on X
                <ArrowRightIcon className="size-4" />
              </a>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Company &amp; contact
            </h2>
            <dl className="mt-6 flex flex-col divide-y text-sm">
              <div className="flex flex-col gap-1 py-4 first:pt-0 sm:flex-row sm:justify-between">
                <dt className="text-muted-foreground">Product</dt>
                <dd>
                  Keenpix — image optimization CDN &amp; open-source engine
                </dd>
              </div>
              <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between">
                <dt className="text-muted-foreground">Contact</dt>
                <dd>
                  <a
                    className="text-foreground hover:underline"
                    href={`mailto:${SUPPORT_EMAIL}`}
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </dd>
              </div>
              <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between">
                <dt className="text-muted-foreground">Source</dt>
                <dd>
                  <a
                    className="text-foreground hover:underline"
                    href={REPOSITORY_URL}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open source on GitHub (AGPL)
                  </a>
                </dd>
              </div>
            </dl>
            <div className="mt-10 flex flex-wrap gap-3">
              <a className={buttonVariants()} href="/docs/self-hosting">
                Self-host free
              </a>
              <a
                className={buttonVariants({ variant: 'outline' })}
                href="/blog"
              >
                Read the blog
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
