import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
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
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Keenpix vs {comparison.competitor}
            </span>
            <h1 className="mt-2 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              {comparison.heroHeadline}
            </h1>
            <p className="mt-4 max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed">
              {comparison.heroSubhead}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className={buttonVariants({
                  className: 'min-h-11 touch-manipulation px-4',
                })}
                to="/signup"
              >
                Start free trial
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
              <a
                className={buttonVariants({
                  className: 'min-h-11 touch-manipulation px-4',
                  variant: 'outline',
                })}
                href="/docs/self-hosting"
              >
                Self-host
              </a>
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              The honest verdict
            </h2>
            <div className="mt-6 rounded-lg border bg-card p-6">
              <p className="text-muted-foreground leading-relaxed">
                {comparison.verdict}
              </p>
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-10">
            <h2 className="font-semibold text-xl tracking-tight">
              Disclosure and sources
            </h2>
            <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
              Keenpix publishes this comparison and benefits if you choose
              Keenpix. Vendor facts were checked against the primary sources
              below in {comparison.pricingAsOf}. Pricing scenarios are estimates
              using the displayed assumptions, not quotes; contracts, taxes,
              regions, cache behavior, and legacy plans can change a real bill.
            </p>
            <p className="mt-2 text-muted-foreground text-sm">
              Reviewed by {comparison.reviewer}. Facts verified{' '}
              <time dateTime={comparison.verifiedAt}>
                {comparison.verifiedAt}
              </time>
              ; next scheduled review{' '}
              <time dateTime={comparison.nextReviewAt}>
                {comparison.nextReviewAt}
              </time>
              .
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {comparison.sources.map((source) => (
                <li key={source.url}>
                  <a
                    className="font-medium text-primary hover:underline"
                    href={source.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  className="font-medium text-primary hover:underline"
                  href="/methodology/comparisons"
                >
                  Full methodology and corrections policy
                </a>
              </li>
            </ul>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-4xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Pricing compared
            </h2>
            <div className="mt-6 rounded-lg border">
              <Table className="min-w-2xl">
                <TableCaption className="sr-only">
                  Pricing comparison between {comparison.competitor} and Keenpix
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3 px-4">Scenario</TableHead>
                    <TableHead className="w-1/3 px-4">
                      {comparison.competitor}
                    </TableHead>
                    <TableHead className="w-1/3 px-4">Keenpix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.pricingRows.map((row) => (
                    <TableRow key={row.scenario}>
                      <TableCell className="whitespace-normal p-4 align-top font-medium">
                        {row.scenario}
                      </TableCell>
                      <TableCell className="whitespace-normal p-4 align-top text-muted-foreground">
                        {row.competitor}
                      </TableCell>
                      <TableCell className="whitespace-normal p-4 align-top">
                        {row.keenpix}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-4 text-muted-foreground text-xs">
              Pricing as of {comparison.pricingAsOf}. Numbers come from vendor
              pricing pages, which may change.
            </p>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-4xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Feature by feature
            </h2>
            <div className="mt-6 rounded-lg border">
              <Table className="min-w-2xl">
                <TableCaption className="sr-only">
                  Feature comparison between {comparison.competitor} and Keenpix
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3 px-4">Feature</TableHead>
                    <TableHead className="w-1/3 px-4">
                      {comparison.competitor}
                    </TableHead>
                    <TableHead className="w-1/3 px-4">Keenpix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.featureRows.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="whitespace-normal p-4 align-top font-medium">
                        {row.feature}
                      </TableCell>
                      <TableCell className="whitespace-normal p-4 align-top text-muted-foreground">
                        {row.competitor}
                      </TableCell>
                      <TableCell className="whitespace-normal p-4 align-top">
                        {row.keenpix}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Why teams switch
            </h2>
            <div className="mt-8 flex flex-col gap-6">
              {comparison.switchReasons.map((reason) => (
                <div className="border-border border-l pl-4" key={reason.title}>
                  <h3 className="font-semibold">{reason.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {reason.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              When {comparison.competitor} is the better choice
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              An honest comparison lists both columns. Stay with{' '}
              {comparison.competitor} if any of these describe you:
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {comparison.whenCompetitorWins.map((item) => (
                <li
                  className="rounded-lg border bg-card p-4 leading-relaxed"
                  key={item}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              How to migrate from {comparison.competitor}
            </h2>
            <ol className="mt-8 flex list-none flex-col gap-5">
              {comparison.migrationSteps.map((step, index) => (
                <li className="flex gap-4" key={step}>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted font-mono text-xs">
                    {index + 1}
                  </span>
                  <p className="min-w-0 break-words text-muted-foreground leading-relaxed [overflow-wrap:anywhere]">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Frequently asked questions
            </h2>
            <div className="mt-6 flex flex-col divide-y">
              {comparison.faq.map((item) => (
                <div className="py-5" key={item.q}>
                  <h3 className="font-semibold">{item.q}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              More comparisons
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {related.map((other) => (
                <Link
                  className="group flex flex-col gap-2 rounded-lg border bg-card p-5 transition-colors hover:border-ring/60 hover:bg-muted/40"
                  key={other.slug}
                  params={{ slug: other.slug }}
                  to="/compare/$slug"
                >
                  <span className="text-muted-foreground text-xs">
                    Keenpix vs {other.competitor}
                  </span>
                  <span className="font-semibold leading-snug group-hover:text-primary">
                    {other.heroHeadline}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              className="mt-6 inline-flex items-center gap-1 font-medium text-primary text-sm hover:underline"
              to="/compare"
            >
              See all comparisons
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
