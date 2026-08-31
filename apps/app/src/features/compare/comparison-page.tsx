import { Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'
import { COMPARISONS, type ComparisonPageData } from './comparison-data'

const sectionLinks = [
  { href: '#verdict', label: 'Verdict' },
  { href: '#worksheet', label: 'Worksheet' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#features', label: 'Features' },
  { href: '#tradeoffs', label: 'Trade-offs' },
  { href: '#migration', label: 'Migration' },
  { href: '#faq', label: 'FAQ' },
]

export function ComparisonFaq({ faq }: { faq: ComparisonPageData['faq'] }) {
  return (
    <Accordion className="rounded-xl border bg-card px-5 shadow-sm sm:px-6">
      {faq.map((item) => (
        <AccordionItem key={item.q} value={item.q}>
          <AccordionTrigger className="py-5 text-base leading-snug sm:text-lg">
            {item.q}
          </AccordionTrigger>
          <AccordionContent>
            <p className="max-w-3xl pb-1 text-base text-muted-foreground leading-relaxed">
              {item.a}
            </p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export function ComparisonPage({
  comparison,
}: {
  comparison: ComparisonPageData
}) {
  const related = Object.values(COMPARISONS).filter(
    (other) => other.slug !== comparison.slug,
  )

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:py-18 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end lg:py-20">
            <div>
              <Badge variant="secondary">
                Keenpix vs {comparison.competitor}
              </Badge>
              <h1 className="mt-4 max-w-4xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl lg:text-6xl">
                {comparison.heroHeadline}
              </h1>
              <p className="mt-5 max-w-3xl text-pretty text-lg text-muted-foreground leading-relaxed sm:text-xl">
                {comparison.heroSubhead}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className={buttonVariants({
                    className: 'min-h-11 touch-manipulation px-5',
                  })}
                  data-analytics-comparison-cta={
                    comparison.activation ? comparison.slug : undefined
                  }
                  to={comparison.activation?.destination ?? '/signup'}
                >
                  {comparison.activation?.label ?? 'Start free trial'}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
                <a
                  className={buttonVariants({
                    className: 'min-h-11 touch-manipulation px-5',
                    variant: 'outline',
                  })}
                  href="/docs/self-hosting"
                >
                  Self-host
                </a>
                <a
                  className={buttonVariants({
                    className: 'min-h-11 touch-manipulation px-5',
                    variant: 'outline',
                  })}
                  href="/image-cdn-cost-calculator"
                >
                  Compare costs
                </a>
              </div>
            </div>

            <aside
              aria-label="Comparison review details"
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 font-medium text-sm">
                <CalendarCheckIcon className="size-4 text-primary" />
                Review details
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm lg:grid-cols-1">
                <div>
                  <dt className="text-muted-foreground">Facts verified</dt>
                  <dd className="mt-1 font-medium">
                    <time dateTime={comparison.verifiedAt}>
                      {comparison.verifiedAt}
                    </time>
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
                <div>
                  <dt className="text-muted-foreground">Reviewed by</dt>
                  <dd className="mt-1 font-medium">{comparison.reviewer}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Primary sources</dt>
                  <dd className="mt-1 font-medium">
                    {comparison.sources.length} linked below
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <nav aria-label="On this page" className="border-b bg-background">
          <div className="mx-auto max-w-6xl overflow-x-auto px-6">
            <div className="flex min-w-max gap-1 py-3">
              {sectionLinks.map((item) => (
                <a
                  className="rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </nav>

        <section className="scroll-mt-24 border-b" id="verdict">
          <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
            <div className="mb-7">
              <span className="font-medium text-primary text-sm">
                Bottom line
              </span>
              <h2 className="mt-2 font-semibold text-3xl tracking-tight">
                The honest verdict
              </h2>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
              <p className="max-w-4xl text-pretty text-lg leading-8">
                {comparison.verdict}
              </p>
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <h2 className="font-semibold text-2xl tracking-tight">
                Disclosure and source policy
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Keenpix publishes this comparison and benefits if you choose
                Keenpix. Vendor facts were checked against the primary sources
                listed here in {comparison.pricingAsOf}. Pricing scenarios are
                estimates using the displayed assumptions, not quotes;
                contracts, taxes, regions, cache behavior, and legacy plans can
                change a real bill.
              </p>
              <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                Facts verified{' '}
                <time dateTime={comparison.verifiedAt}>
                  {comparison.verifiedAt}
                </time>
                ; next scheduled review{' '}
                <time dateTime={comparison.nextReviewAt}>
                  {comparison.nextReviewAt}
                </time>
                . Reviewed by {comparison.reviewer}.
              </p>
              <a
                className="mt-5 inline-flex items-center gap-1.5 font-medium text-primary text-sm hover:underline"
                href="/methodology/comparisons"
              >
                Full methodology and corrections policy
                <ArrowRightIcon className="size-4" />
              </a>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Primary source list</h3>
              <ul className="mt-3 overflow-hidden rounded-xl border bg-card">
                {comparison.sources.map((source) => (
                  <li className="border-b last:border-b-0" key={source.url}>
                    <a
                      className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 font-medium text-sm transition-colors hover:bg-muted"
                      href={source.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span>{source.label}</span>
                      <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="scroll-mt-24 border-b" id="worksheet">
          <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
            <span className="font-medium text-primary text-sm">
              Decision worksheet
            </span>
            <h2 className="mt-2 max-w-3xl font-semibold text-3xl tracking-tight">
              How to compare {comparison.competitor} and Keenpix with your own
              workload
            </h2>
            <p className="mt-4 max-w-4xl text-muted-foreground leading-relaxed">
              A headline plan price is not a total-cost comparison. Use one
              representative month, preserve every excluded meter, and test the
              product boundary before deciding. The five checks below are the
              same ones Keenpix uses for its source-dated calculator and
              comparison reviews. Save the inputs, official source URLs,
              response headers, and test date with the decision so a later
              pricing or cache-policy change can be audited instead of
              remembered.
            </p>
            <div className="mt-8 grid gap-4">
              <article className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="font-semibold text-lg">
                  1. Capture the workload before choosing units
                </h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  Record delivered image GB after optimization, request count,
                  source storage, unique generated variants, projects or sites,
                  custom domains, delivery regions, source-change frequency, and
                  cache hit behavior. Use a normal month and a peak month. Do
                  not start by translating one vendor unit into another: a
                  credit, transformation, cache read, worker, stored image, and
                  delivered GB describe different work. If a required input is
                  unavailable, label the resulting estimate partial instead of
                  replacing it with zero.
                </p>
              </article>
              <article className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="font-semibold text-lg">
                  2. Normalize the product boundary, not only the invoice
                </h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  List what {comparison.competitor} includes that Keenpix does
                  not and what your team would need to replace. That may include
                  source storage, DAM workflows, video, a hosting platform, a
                  bundled CDN, AI operations, upload widgets, support, or a
                  self-hosted engine. Then list what sits outside each public
                  price: transfer, requests, infrastructure, observability,
                  additional domains, plan minimums, and operator time. A lower
                  partial subtotal is not automatically a lower complete bill,
                  and a broader platform can be worth paying for when you use
                  its breadth.
                </p>
              </article>
              <article className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="font-semibold text-lg">
                  3. Test cache and failure behavior
                </h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  Run a representative URL set through both options. Measure a
                  cold transform, a warm generated-variant hit, an edge hit, an
                  expired source, an invalid signature, an unavailable origin,
                  and a request above the usage allowance. Confirm which layer
                  records billable usage and whether browser or customer-owned
                  CDN hits reach it. Document cache keys, invalidation, stale
                  behavior, retry limits, and the response users receive at a
                  limit. Provider documentation is necessary, but a canary with
                  your headers, URLs, and origins is the stronger acceptance
                  test.
                </p>
              </article>
              <article className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="font-semibold text-lg">
                  4. Price ownership and security work
                </h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  Identify who owns origin allowlists, SSRF protection, signing
                  keys, abuse controls, TLS, DNS, capacity, updates,
                  vulnerability response, dashboards, logs, alerts, backups,
                  incident response, and cost anomalies. A managed service moves
                  some of those responsibilities to a vendor; a self-hosted or
                  platform-native option may keep them with your existing team.
                  Compare the architecture you will actually operate, including
                  on-call and recovery expectations, rather than valuing
                  engineering time at zero or assuming a managed boundary
                  eliminates every integration task.
                </p>
              </article>
              <article className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="font-semibold text-lg">
                  5. Define migration and rollback before the winner
                </h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  Inventory production transformation options and save visual
                  fixtures before translating URLs. Decide whether originals
                  move, whether both services can read the same origin, how
                  signatures and custom domains change, and how long old URLs
                  must remain valid. Canary a measurable traffic slice and set
                  acceptance thresholds for output dimensions, visual crops,
                  content type, cache behavior, latency, errors, and projected
                  cost. Keep the old path available until a complete traffic
                  cycle passes. The right choice is the one that meets those
                  thresholds and has a credible rollback, not the one with the
                  longest feature column.
                </p>
              </article>
            </div>
            <a
              className="mt-6 inline-flex items-center gap-1.5 font-medium text-primary text-sm hover:underline"
              href="/image-cdn-cost-calculator"
            >
              Model this workload in the cost calculator
              <ArrowRightIcon className="size-4" />
            </a>
            {comparison.evaluationChecks ? (
              <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="font-semibold text-xl tracking-tight">
                  Reproduce this {comparison.competitor} review
                </h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  The linked public sources, this review method, and the cited
                  Keenpix v0.3.1 behavior were last checked on{' '}
                  <time dateTime={comparison.verifiedAt}>
                    {comparison.verifiedAt}
                  </time>
                  . Save the inputs, outputs, headers, account tier, and test
                  date so another reviewer can repeat the decision.
                </p>
                <ol className="mt-5 grid gap-3">
                  {comparison.evaluationChecks.map((check, index) => (
                    <li
                      className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 text-sm leading-relaxed"
                      key={check}
                    >
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 font-mono text-primary text-xs">
                        {index + 1}
                      </span>
                      <span className="pt-1 text-muted-foreground">
                        {check}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </section>

        <section className="scroll-mt-24 border-b" id="pricing">
          <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
            <span className="font-medium text-primary text-sm">Costs</span>
            <h2 className="mt-2 font-semibold text-3xl tracking-tight">
              Pricing compared
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground leading-relaxed">
              Pricing as of {comparison.pricingAsOf}. Numbers come from vendor
              pricing pages, which may change.
            </p>
            <Table
              className="min-w-[44rem]"
              containerClassName="mt-7 rounded-xl border bg-card shadow-sm"
            >
              <TableCaption className="sr-only">
                Pricing comparison between {comparison.competitor} and Keenpix
              </TableCaption>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-1/3 px-5">Scenario</TableHead>
                  <TableHead className="w-1/3 px-5">
                    {comparison.competitor}
                  </TableHead>
                  <TableHead className="w-1/3 bg-primary/5 px-5 text-foreground">
                    Keenpix
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.pricingRows.map((row) => (
                  <TableRow key={row.scenario}>
                    <TableCell className="whitespace-normal p-5 align-top font-medium leading-relaxed">
                      {row.scenario}
                    </TableCell>
                    <TableCell className="whitespace-normal p-5 align-top text-muted-foreground leading-relaxed">
                      {row.competitor}
                    </TableCell>
                    <TableCell className="whitespace-normal bg-primary/[0.03] p-5 align-top leading-relaxed">
                      {row.keenpix}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="scroll-mt-24 border-b bg-muted/30" id="features">
          <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
            <span className="font-medium text-primary text-sm">
              Capabilities
            </span>
            <h2 className="mt-2 font-semibold text-3xl tracking-tight">
              Feature by feature
            </h2>
            <Table
              className="min-w-[44rem]"
              containerClassName="mt-7 rounded-xl border bg-card shadow-sm"
            >
              <TableCaption className="sr-only">
                Feature comparison between {comparison.competitor} and Keenpix
              </TableCaption>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-1/3 px-5">Feature</TableHead>
                  <TableHead className="w-1/3 px-5">
                    {comparison.competitor}
                  </TableHead>
                  <TableHead className="w-1/3 bg-primary/5 px-5 text-foreground">
                    Keenpix
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.featureRows.map((row) => (
                  <TableRow key={row.feature}>
                    <TableCell className="whitespace-normal p-5 align-top font-medium leading-relaxed">
                      {row.feature}
                    </TableCell>
                    <TableCell className="whitespace-normal p-5 align-top text-muted-foreground leading-relaxed">
                      {row.competitor}
                    </TableCell>
                    <TableCell className="whitespace-normal bg-primary/[0.03] p-5 align-top leading-relaxed">
                      {row.keenpix}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="scroll-mt-24 border-b" id="tradeoffs">
          <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
            <span className="font-medium text-primary text-sm">
              Fit and trade-offs
            </span>
            <h2 className="mt-2 font-semibold text-3xl tracking-tight">
              Why teams switch
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {comparison.switchReasons.map((reason) => (
                <article
                  className="rounded-xl border bg-card p-6 shadow-sm"
                  key={reason.title}
                >
                  <h3 className="font-semibold text-lg">{reason.title}</h3>
                  <p className="mt-3 text-muted-foreground leading-relaxed">
                    {reason.detail}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-14 rounded-xl border bg-muted/30 p-6 sm:p-8">
              <h2 className="font-semibold text-2xl tracking-tight">
                When {comparison.competitor} is the better choice
              </h2>
              <p className="mt-3 max-w-3xl text-muted-foreground leading-relaxed">
                An honest comparison lists both columns. Stay with{' '}
                {comparison.competitor} if any of these describe you:
              </p>
              <ul className="mt-6 grid gap-3 md:grid-cols-2">
                {comparison.whenCompetitorWins.map((item) => (
                  <li
                    className="rounded-lg border bg-card p-5 leading-relaxed"
                    key={item}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="scroll-mt-24 border-b bg-muted/30" id="migration">
          <div className="mx-auto max-w-4xl px-6 py-14 sm:py-16">
            <span className="font-medium text-primary text-sm">
              Practical path
            </span>
            <h2 className="mt-2 font-semibold text-3xl tracking-tight">
              How to migrate from {comparison.competitor}
            </h2>
            <ol className="mt-8 grid list-none gap-4">
              {comparison.migrationSteps.map((step, index) => (
                <li
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4 rounded-xl border bg-card p-5 shadow-sm"
                  key={step}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-primary-foreground text-xs">
                    {index + 1}
                  </span>
                  <p className="min-w-0 break-words pt-1 text-muted-foreground leading-relaxed [overflow-wrap:anywhere]">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="scroll-mt-24 border-b" id="faq">
          <div className="mx-auto max-w-4xl px-6 py-14 sm:py-16">
            <span className="font-medium text-primary text-sm">
              Questions answered
            </span>
            <h2 className="mt-2 font-semibold text-3xl tracking-tight">
              Frequently asked questions
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
              Open a question to review the answer without losing your place in
              the comparison.
            </p>
            <div className="mt-7">
              <ComparisonFaq faq={comparison.faq} />
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <span className="font-medium text-primary text-sm">
                  Keep comparing
                </span>
                <h2 className="mt-2 font-semibold text-3xl tracking-tight">
                  More comparisons
                </h2>
              </div>
              <Link
                className="inline-flex items-center gap-1 font-medium text-primary text-sm hover:underline"
                to="/compare"
              >
                See all comparisons
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((other) => (
                <Link
                  className="group flex min-h-36 flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-ring/60 hover:bg-muted/40"
                  key={other.slug}
                  params={{ slug: other.slug }}
                  to="/compare/$slug"
                >
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Keenpix vs {other.competitor}
                  </span>
                  <span className="font-semibold leading-snug group-hover:text-primary">
                    {other.heroHeadline}
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 font-medium text-primary text-sm">
                    Read comparison
                    <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
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
