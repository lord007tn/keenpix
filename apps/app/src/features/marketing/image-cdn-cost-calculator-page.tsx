import { Link } from '@tanstack/react-router'
import {
  BarChart3Icon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import { useState } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'
import {
  calculateImageCdnCosts,
  type ImageCdnCostInputs,
} from '@/helpers/pricing/image-cdn-cost-calculator/calculate-image-cdn-cost'
import {
  IMAGE_CDN_CALCULATOR_FAQ,
  IMAGE_CDN_PRICING,
} from '@/shared/image-cdn-pricing'

export function ImageCdnCostCalculatorPage({
  initialInputs,
}: {
  initialInputs: ImageCdnCostInputs
}) {
  const [inputs, setInputs] = useState(() => initialInputs)
  const [copied, setCopied] = useState(false)
  const results = calculateImageCdnCosts(inputs)
  const comparisonRows = results
    .map((result) => {
      const costRange =
        'monthlyHigh' in result
          ? {
              chartValue: result.monthlyHigh,
              monthlyHigh: result.monthlyHigh,
            }
          : { chartValue: result.monthly, monthlyHigh: null }
      return {
        ...result,
        ...costRange,
        vendor: IMAGE_CDN_PRICING.vendors.find(
          (vendor) => vendor.id === result.id,
        ),
      }
    })
    .sort(
      (left, right) =>
        (left.monthly ?? Number.POSITIVE_INFINITY) -
        (right.monthly ?? Number.POSITIVE_INFINITY),
    )
  const chartMaximum = Math.max(
    1,
    ...comparisonRows.map((result) => result.chartValue ?? 0),
  )
  const lowestComparable = comparisonRows.find(
    (result) => result.status === 'comparable' && result.monthly !== null,
  )

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto grid max-w-7xl gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:py-2">
            <div>
              <Badge className="hidden sm:inline-flex" variant="secondary">
                Source-dated cost model
              </Badge>
              <h1 className="max-w-4xl text-balance font-semibold text-2xl tracking-tight sm:mt-3 sm:text-4xl lg:text-5xl">
                Image CDN cost calculator
              </h1>
              <p className="mt-2 max-w-3xl text-pretty text-muted-foreground text-sm leading-snug sm:mt-3 sm:text-lg sm:leading-relaxed">
                Compare the same workload across ten image CDNs—without a
                sideways-scrolling pricing table.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-muted-foreground text-xs sm:text-sm lg:justify-end">
              <span className="hidden sm:inline">
                Prices checked {IMAGE_CDN_PRICING.verifiedAt}
              </span>
              <a
                className="font-medium text-primary hover:underline"
                href="/image-cdn-pricing.json"
              >
                Pricing data (JSON)
              </a>
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-4 sm:px-6 sm:py-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
            <form
              className="order-2 rounded-xl border bg-card p-4 shadow-sm lg:sticky lg:top-4 lg:order-1"
              onSubmit={(event) => {
                event.preventDefault()
                const search = new URLSearchParams({
                  deliveredGb: String(inputs.deliveredGb),
                  requests: String(inputs.requests),
                  sourceStorageGb: String(inputs.sourceStorageGb),
                  uniqueTransforms: String(inputs.uniqueTransforms),
                  projects: String(inputs.projects),
                  customDomains: String(inputs.customDomains),
                  region: inputs.region,
                })
                window.history.replaceState(
                  null,
                  '',
                  `${window.location.pathname}?${search}`,
                )
              }}
            >
              <div>
                <span className="font-mono text-primary text-xs uppercase tracking-wide">
                  Scenario inputs
                </span>
                <h2 className="mt-1 font-semibold text-xl tracking-tight">
                  Your monthly workload
                </h2>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs" htmlFor="delivered-gb">
                    Delivered GB
                  </Label>
                  <Input
                    id="delivered-gb"
                    min="0"
                    onChange={(event) =>
                      setInputs({
                        ...inputs,
                        deliveredGb: Math.max(0, Number(event.target.value)),
                      })
                    }
                    type="number"
                    value={inputs.deliveredGb}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs" htmlFor="requests">
                    Requests
                  </Label>
                  <Input
                    id="requests"
                    min="0"
                    onChange={(event) =>
                      setInputs({
                        ...inputs,
                        requests: Math.max(0, Number(event.target.value)),
                      })
                    }
                    type="number"
                    value={inputs.requests}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs" htmlFor="storage">
                    Storage GB
                  </Label>
                  <Input
                    id="storage"
                    min="0"
                    onChange={(event) =>
                      setInputs({
                        ...inputs,
                        sourceStorageGb: Math.max(
                          0,
                          Number(event.target.value),
                        ),
                      })
                    }
                    type="number"
                    value={inputs.sourceStorageGb}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs" htmlFor="transforms">
                    Transforms
                  </Label>
                  <Input
                    id="transforms"
                    min="0"
                    onChange={(event) =>
                      setInputs({
                        ...inputs,
                        uniqueTransforms: Math.max(
                          0,
                          Number(event.target.value),
                        ),
                      })
                    }
                    type="number"
                    value={inputs.uniqueTransforms}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs" htmlFor="projects">
                    Projects / sites
                  </Label>
                  <Input
                    id="projects"
                    min="1"
                    onChange={(event) =>
                      setInputs({
                        ...inputs,
                        projects: Math.max(1, Number(event.target.value)),
                      })
                    }
                    type="number"
                    value={inputs.projects}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs" htmlFor="domains">
                    Custom domains
                  </Label>
                  <Input
                    id="domains"
                    min="0"
                    onChange={(event) =>
                      setInputs({
                        ...inputs,
                        customDomains: Math.max(0, Number(event.target.value)),
                      })
                    }
                    type="number"
                    value={inputs.customDomains}
                  />
                </div>
                <div className="col-span-2 grid gap-2">
                  <Label className="text-xs" htmlFor="region">
                    Bunny CDN region
                  </Label>
                  <select
                    className="flex min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    id="region"
                    onChange={(event) => {
                      const region = event.target.value
                      if (
                        region === 'eu-na' ||
                        region === 'asia' ||
                        region === 'south-america' ||
                        region === 'mea'
                      ) {
                        setInputs({ ...inputs, region })
                      }
                    }}
                    value={inputs.region}
                  >
                    <option value="eu-na">Europe / North America</option>
                    <option value="asia">Asia / Oceania</option>
                    <option value="south-america">South America</option>
                    <option value="mea">Middle East / Africa</option>
                  </select>
                </div>
              </div>
              <Button className="mt-4 w-full" type="submit">
                Update shareable URL
              </Button>
            </form>

            <div className="order-1 min-w-0 rounded-xl border bg-card shadow-sm lg:order-2">
              <div className="flex flex-row items-start justify-between gap-3 border-b p-4 sm:items-center sm:px-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                    <BarChart3Icon className="size-4" />
                  </div>
                  <div>
                    <span className="font-mono text-primary text-xs uppercase tracking-wide">
                      Monthly cost range
                    </span>
                    <h2 className="mt-0.5 font-semibold text-xl tracking-tight sm:text-2xl">
                      All ten providers, one view
                    </h2>
                    <p className="mt-1 text-muted-foreground text-xs sm:text-sm">
                      Ranked by published estimate. Longer bars cost more.
                    </p>
                  </div>
                </div>
                <Button
                  aria-label={
                    copied ? 'Scenario URL copied' : 'Copy scenario URL'
                  }
                  className="size-8 self-start p-0 sm:size-auto sm:self-auto sm:px-4"
                  onClick={async () => {
                    await navigator.clipboard.writeText(window.location.href)
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 2000)
                  }}
                  type="button"
                  variant="outline"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  <span className="hidden sm:inline">
                    {copied ? 'Copied' : 'Copy scenario'}
                  </span>
                </Button>
              </div>

              <ul
                aria-label="Estimated monthly image CDN cost comparison"
                className="list-none divide-y px-3 sm:px-5"
              >
                {comparisonRows.map((result) => {
                  let monthlyLabel = 'Quote'
                  if (result.monthly !== null) {
                    monthlyLabel = `$${result.monthly.toFixed(2)}`
                    if (result.monthlyHigh !== null) {
                      monthlyLabel += `–$${result.monthlyHigh.toFixed(2)}`
                    }
                  }
                  return (
                    <li
                      className="grid min-h-9 grid-cols-[6.75rem_minmax(0,1fr)_4.75rem] items-center gap-2 py-1 sm:grid-cols-[10rem_minmax(0,1fr)_7rem] sm:gap-3"
                      key={result.id}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-xs sm:text-sm">
                          {result.vendor?.name}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground sm:text-xs">
                          {result.plan}
                        </div>
                      </div>
                      <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                        {result.chartValue === null ? (
                          <div className="absolute inset-0 border border-muted-foreground/30 border-dashed" />
                        ) : (
                          <div
                            className={`h-full min-w-1.5 rounded-full transition-[width] duration-500 motion-reduce:transition-none ${
                              result.id === 'keenpix'
                                ? 'bg-primary'
                                : 'bg-muted-foreground/35'
                            }`}
                            style={{
                              width: `${Math.max(
                                1.5,
                                (result.chartValue / chartMaximum) * 100,
                              )}%`,
                            }}
                          />
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-xs tabular-nums sm:text-sm">
                          {monthlyLabel.replaceAll('.00', '')}
                        </div>
                        <div className="hidden text-[10px] text-muted-foreground sm:block">
                          {result.status}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="hidden grid-cols-3 divide-x border-t bg-muted/30 text-center sm:grid">
                <div className="p-3">
                  <div className="font-semibold tabular-nums">
                    {comparisonRows.length}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    providers
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-semibold tabular-nums">
                    {
                      comparisonRows.filter((result) => result.monthly !== null)
                        .length
                    }
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    priced
                  </div>
                </div>
                <div className="p-3">
                  <div className="truncate font-semibold text-sm tabular-nums">
                    {lowestComparable?.vendor?.name ?? '—'}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    lowest comparable
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
            <span className="font-mono text-primary text-xs uppercase tracking-wide">
              Pricing boundaries
            </span>
            <h2 className="mt-2 font-semibold text-3xl tracking-tight">
              What each estimate includes
            </h2>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {comparisonRows.map((result) => {
                let monthlyLabel = 'Custom quote'
                if (result.monthly !== null) {
                  monthlyLabel = `$${result.monthly.toFixed(2)}/month`
                  if (result.monthlyHigh !== null) {
                    monthlyLabel = `$${result.monthly.toFixed(2)}–$${result.monthlyHigh.toFixed(2)}/month`
                  }
                }
                return (
                  <article
                    className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                    key={result.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{result.vendor?.name}</h3>
                        <Badge
                          variant={
                            result.status === 'quote' ? 'outline' : 'secondary'
                          }
                        >
                          {result.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                        {result.detail}
                      </p>
                      <a
                        className="mt-2 inline-flex items-center gap-1 font-medium text-primary text-xs hover:underline"
                        href={result.vendor?.source}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Official pricing source
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    </div>
                    <div className="sm:text-right">
                      <div className="font-semibold text-sm tabular-nums">
                        {monthlyLabel}
                      </div>
                      <div className="mt-1 text-muted-foreground text-xs">
                        {result.plan}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
            <span className="font-medium text-primary text-sm">
              Read before deciding
            </span>
            <h2 className="mt-2 font-semibold text-3xl tracking-tight">
              Methodology and limitations
            </h2>
            <p className="mt-4 max-w-4xl text-muted-foreground leading-relaxed">
              {IMAGE_CDN_PRICING.methodology}
            </p>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold">Comparable</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  The published inputs support a useful monthly estimate for
                  this scenario.
                </p>
              </article>
              <article className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold">Partial</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  The displayed number excludes a material vendor meter or your
                  operating cost.
                </p>
              </article>
              <article className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold">Quote</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  The scenario exceeds a public self-serve package or needs
                  negotiated terms.
                </p>
              </article>
            </div>
            <p className="mt-6 text-muted-foreground text-sm">
              Last verified {IMAGE_CDN_PRICING.verifiedAt}; next scheduled
              review {IMAGE_CDN_PRICING.nextReviewAt}. Corrections:{' '}
              <a
                className="font-medium text-primary hover:underline"
                href="mailto:hi@raedbahri.com"
              >
                hi@raedbahri.com
              </a>
              .
            </p>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-4xl px-6 py-14 sm:py-16">
            <h2 className="font-semibold text-3xl tracking-tight">
              Calculator questions
            </h2>
            <Accordion className="mt-7 rounded-xl border bg-card px-5 shadow-sm sm:px-6">
              {IMAGE_CDN_CALCULATOR_FAQ.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="py-5 text-base">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="pb-1 text-base text-muted-foreground leading-relaxed">
                      {item.a}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-5xl px-6 py-14 text-center sm:py-16">
            <h2 className="font-semibold text-3xl tracking-tight">
              Cost is only one product boundary
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground leading-relaxed">
              Review source-backed feature and migration trade-offs before
              choosing a delivery architecture.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link className={buttonVariants()} to="/compare">
                Compare providers
              </Link>
              <Link
                className={buttonVariants({ variant: 'outline' })}
                to="/self-hosted-image-cdn"
              >
                Evaluate self-hosting
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
