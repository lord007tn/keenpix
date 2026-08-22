import { Link } from '@tanstack/react-router'
import { CheckIcon, CopyIcon, ExternalLinkIcon } from 'lucide-react'
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

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-14 sm:py-18 lg:py-20">
            <Badge variant="secondary">Source-dated cost model</Badge>
            <h1 className="mt-4 max-w-4xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl lg:text-6xl">
              Image CDN cost calculator
            </h1>
            <p className="mt-5 max-w-3xl text-pretty text-lg text-muted-foreground leading-relaxed sm:text-xl">
              Model the same workload across ten image-delivery options. Every
              row shows its boundary, source, and whether the result is fully
              comparable, partial, or needs a quote.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground text-sm">
              <span>Prices checked {IMAGE_CDN_PRICING.verifiedAt}</span>
              <a
                className="font-medium text-primary hover:underline"
                href="/image-cdn-pricing.json"
              >
                Download pricing data (JSON)
              </a>
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
            <form
              className="rounded-xl border bg-card p-5 shadow-sm lg:sticky lg:top-6"
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
                <h2 className="mt-2 font-semibold text-2xl tracking-tight">
                  Your monthly workload
                </h2>
              </div>
              <div className="mt-6 grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="delivered-gb">Delivered image GB</Label>
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
                  <Label htmlFor="requests">Image requests</Label>
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
                  <Label htmlFor="storage">Source storage GB</Label>
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
                  <Label htmlFor="transforms">Unique transforms</Label>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="projects">Projects / sites</Label>
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
                    <Label htmlFor="domains">Custom domains</Label>
                    <Input
                      id="domains"
                      min="0"
                      onChange={(event) =>
                        setInputs({
                          ...inputs,
                          customDomains: Math.max(
                            0,
                            Number(event.target.value),
                          ),
                        })
                      }
                      type="number"
                      value={inputs.customDomains}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="region">Bunny CDN region</Label>
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
              <Button className="mt-6 w-full" type="submit">
                Update shareable URL
              </Button>
            </form>

            <div className="min-w-0">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <span className="font-mono text-primary text-xs uppercase tracking-wide">
                    Monthly estimates
                  </span>
                  <h2 className="mt-2 font-semibold text-3xl tracking-tight">
                    Same inputs, stated boundaries
                  </h2>
                </div>
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(window.location.href)
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 2000)
                  }}
                  type="button"
                  variant="outline"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? 'Copied' : 'Copy scenario'}
                </Button>
              </div>

              <div className="mt-7 grid gap-4">
                {results.map((result) => {
                  const vendor = IMAGE_CDN_PRICING.vendors.find(
                    (item) => item.id === result.id,
                  )
                  let monthlyLabel = 'Quote'
                  if (result.monthly !== null) {
                    monthlyLabel = `$${result.monthly.toFixed(2)}`
                    if ('monthlyHigh' in result) {
                      monthlyLabel += `–$${result.monthlyHigh.toFixed(2)}`
                    }
                  }
                  return (
                    <article
                      className="grid gap-5 rounded-xl border bg-card p-5 shadow-sm sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center"
                      key={result.id}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {vendor?.name}
                          </h3>
                          <Badge
                            variant={
                              result.status === 'quote'
                                ? 'outline'
                                : 'secondary'
                            }
                          >
                            {result.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                          {result.detail}
                        </p>
                        <a
                          className="mt-3 inline-flex items-center gap-1 font-medium text-primary text-sm hover:underline"
                          href={vendor?.source}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Official source{' '}
                          <ExternalLinkIcon className="size-3.5" />
                        </a>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4 sm:text-right">
                        <div className="font-semibold text-2xl tabular-nums">
                          {monthlyLabel}
                        </div>
                        <div className="mt-1 text-muted-foreground text-xs">
                          {result.monthly === null
                            ? 'contact vendor'
                            : 'per month estimate'}
                        </div>
                        <div className="mt-2 font-medium text-sm">
                          {result.plan}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
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
