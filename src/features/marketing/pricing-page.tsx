import { Link } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'
import { FoundingOfferBanner } from '@/components/app/founding-offer-banner'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  getPlanCardFeatures,
  PLAN_CARD_ORDER,
  PLAN_TAGLINES,
} from '@/features/marketing/plan-card-content'
import {
  catalogPricing,
  PLANS,
  type PlanPricing,
  TRIAL,
} from '@/lib/billing/plans'
import { cn } from '@/lib/cn/utils'

const GB = 1024 ** 3
const TRAILING_ZEROS = /\.00$/

function gb(bytes: number): string {
  const value = bytes / GB
  return value >= 1000 ? `${value / 1000} TB` : `${value} GB`
}

function formatUsd(cents: number): string {
  return (cents / 100).toFixed(2).replace(TRAILING_ZEROS, '')
}

// Pricing-specific FAQ, rendered visibly by the
// route. Every number derives from the plans catalog so it can't drift.
const PRICING_FAQ: Array<{ answer: string; question: string }> = [
  {
    question: 'What exactly am I billed for?',
    answer:
      'One meter: optimized bytes delivered to end users through Keenpix managed cloud, whether Cloudflare serves an edge hit, Keenpix returns a cached variant, or Keenpix creates a new transform from the origin. Each successful response is counted once. Bandwidth saved is a separate analytics measure and is never added to delivered bytes. Transformations, responsive variants, requests, and team members are unlimited, and Keenpix has no asset-storage charge. Browser or customer-owned CDN cache hits that never reach Keenpix are not counted.',
  },
  {
    question: 'How does the free trial work?',
    answer: `Every plan starts with a ${TRIAL.days}-day free trial (card required, powered by Polar). You get the plan's full features with up to ${TRIAL.maxProjects} projects and ${gb(TRIAL.bandwidthBytes)} delivered, and trial usage is never billed — metering starts only when the trial converts. Polar emails you before the first charge and you can cancel anytime.`,
  },
  {
    question: 'What happens when I use more than my included delivery?',
    answer:
      'Delivery keeps working and additional gigabytes are billed at the rate shown for the plan you subscribed to: $0.12/$0.09/$0.07 per GB on Basic/Pro/Business. Polar charges accumulated usage at the end of the billing period.',
  },
  {
    question: 'Can overage take my images offline?',
    answer:
      'No. Basic, Pro, and Business continue serving after their included delivery is used. The dashboard shows estimated overage and Keenpix emails you as usage approaches and passes the included allowance. Only an ended subscription, an exhausted free trial, or a separate fraud or abuse intervention stops delivery.',
  },
  {
    question: 'What happens if my payment fails?',
    answer:
      'Nothing breaks immediately. Keenpix keeps serving your images through a dunning grace window while Polar retries the payment, and you get an email right away. Delivery only stops if billing stays unresolved and the subscription ends.',
  },
  {
    question: 'What does self-hosting cost?',
    answer:
      'The entire engine — transform pipeline, dashboard, analytics, allowlists, and signed URLs — is open source under AGPL-3.0 with no Keenpix license fee, feature gates, telemetry, or CLA. You still pay for and operate your own servers, storage, database, backups, monitoring, and delivery network. The managed cloud exists for teams that would rather not own that work.',
  },
]

// (Card content — order, taglines, features — lives in plan-card-content.ts,
// shared with the landing page so the two card sets can never drift.)

const MATRIX: Array<{
  feature: string
  values: [string, string, string, string] // self-host, basic, pro, business
}> = [
  {
    feature: 'Included managed delivery / month',
    values: [
      'Unlimited (your infra)',
      gb(PLANS.basic.includedBandwidthBytes),
      gb(PLANS.pro.includedBandwidthBytes),
      gb(PLANS.business.includedBandwidthBytes),
    ],
  },
  {
    feature: 'Overage per GB',
    values: [
      '—',
      `$${(PLANS.basic.overagePerGbCents / 100).toFixed(2)}`,
      `$${(PLANS.pro.overagePerGbCents / 100).toFixed(2)}`,
      `$${(PLANS.business.overagePerGbCents / 100).toFixed(2)}`,
    ],
  },
  {
    feature: 'Transformations',
    values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
  },
  {
    feature: 'Team members',
    values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
  },
  {
    feature: 'Projects',
    values: [
      'Unlimited',
      String(PLANS.basic.maxProjects),
      String(PLANS.pro.maxProjects),
      'Unlimited',
    ],
  },
  {
    feature: 'Analytics',
    values: [
      'Full (Postgres)',
      `Core · ${PLANS.basic.historyDays} days`,
      `Advanced · ${PLANS.pro.historyDays} days`,
      `Advanced · ${PLANS.business.historyDays} days`,
    ],
  },
  {
    feature: 'Log history & search',
    values: [
      'Unlimited',
      `Recent logs · ${PLANS.basic.logRetentionDays}-day retention`,
      `Full search · ${PLANS.pro.logRetentionDays}-day retention`,
      `Full search · ${PLANS.business.logRetentionDays}-day retention`,
    ],
  },
  {
    feature: 'Signed URLs (hotlink protection)',
    values: ['Included', 'Included', 'Included', 'Included'],
  },
  {
    feature: 'Paid overage behavior',
    values: ['—', 'Keeps serving', 'Keeps serving', 'Keeps serving'],
  },
  {
    feature: 'Free trial',
    values: [
      '—',
      `${TRIAL.days} days`,
      `${TRIAL.days} days`,
      `${TRIAL.days} days`,
    ],
  },
  {
    feature: 'Custom domains',
    values: [
      'Your reverse proxy',
      '—',
      String(PLANS.pro.customDomains),
      `${PLANS.business.customDomains} · +5 for $5/mo`,
    ],
  },
  {
    feature: 'Ops, upgrades, backups',
    values: ['You', 'Managed', 'Managed', 'Managed'],
  },
]

export function PricingPage({ pricing }: { pricing: PlanPricing | null }) {
  const prices = pricing ?? catalogPricing('standard')
  const matrix = MATRIX.map((row) =>
    row.feature === 'Overage per GB'
      ? {
          ...row,
          values: [
            '—',
            `$${(prices.plans.basic.overagePerGbCents / 100).toFixed(2)}`,
            `$${(prices.plans.pro.overagePerGbCents / 100).toFixed(2)}`,
            `$${(prices.plans.business.overagePerGbCents / 100).toFixed(2)}`,
          ] as [string, string, string, string],
        }
      : row,
  )

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-20">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Pricing
            </span>
            <h1 className="mt-2 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              Image CDN pricing with one delivery meter.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed">
              Edge hits, cache hits, and new transforms count once in one clear
              delivery meter. A single published overage rate keeps production
              online through the period. A {TRIAL.days}-day free trial that is
              never billed. Or self-host the whole engine with no Keenpix
              license fee while operating your own infrastructure.
            </p>

            <div className="mt-8 text-left">
              <FoundingOfferBanner offer={prices.foundingOffer} />
            </div>

            <div className="mt-5 grid gap-4 text-left lg:grid-cols-3">
              {PLAN_CARD_ORDER.map((planId) => {
                const plan = PLANS[planId]
                const price = prices.plans[planId]
                const monthlyCents = price.month.amountCents
                const card = getPlanCardFeatures(
                  planId,
                  price.overagePerGbCents,
                )
                const featured = planId === 'pro'
                return (
                  <Card
                    className={cn(featured && 'ring-2 ring-primary')}
                    key={planId}
                  >
                    <CardContent className="flex h-full flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg">{plan.name}</h2>
                        {featured ? <Badge>Most popular</Badge> : null}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-semibold text-4xl tracking-tight">
                          ${formatUsd(monthlyCents)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          /mo
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {PLAN_TAGLINES[planId]}
                      </p>
                      {card.lead ? (
                        <p className="font-medium text-foreground text-sm">
                          {card.lead}
                        </p>
                      ) : null}
                      <ul className="flex flex-col gap-2 text-sm">
                        {card.features.map((feature) => (
                          <li className="flex items-start gap-2" key={feature}>
                            <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span className="text-muted-foreground">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        className={buttonVariants({
                          className:
                            'mt-auto min-h-11 w-full touch-manipulation px-4',
                          variant: featured ? 'default' : 'outline',
                        })}
                        to="/signup"
                      >
                        Start {TRIAL.days}-day free trial
                      </Link>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <p className="mt-6 text-muted-foreground text-sm">
              Card required for the trial; you won’t be charged until it ends,
              and trial usage is never billed.
            </p>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-5xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Compare managed plans with self-hosting
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Self-host is a real tier, not a demo: the same AGPL engine with
              nothing held back. The cloud sells operations, not features.
            </p>
            <div className="mt-8 overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableCaption className="sr-only">
                  Keenpix self-hosted and managed cloud plan comparison
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-56" scope="col">
                      <span className="sr-only">Plan feature</span>
                    </TableHead>
                    <TableHead scope="col">
                      Self-host (no license fee)
                    </TableHead>
                    <TableHead scope="col">Basic</TableHead>
                    <TableHead scope="col">Pro</TableHead>
                    <TableHead scope="col">Business</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Price</TableCell>
                    <TableCell>No Keenpix fee · infrastructure extra</TableCell>
                    {PLAN_CARD_ORDER.map((planId) => (
                      <TableCell key={planId}>
                        ${formatUsd(prices.plans[planId].month.amountCents)}/mo
                      </TableCell>
                    ))}
                  </TableRow>
                  {matrix.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="font-medium">
                        {row.feature}
                      </TableCell>
                      {row.values.map((value, index) => (
                        <TableCell
                          className="text-muted-foreground"
                          // biome-ignore lint/suspicious/noArrayIndexKey: fixed 4-column order
                          key={index}
                        >
                          {value}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-4 text-muted-foreground text-sm">
              Prefer to run it yourself?{' '}
              <a
                className="text-foreground underline"
                href="/docs/self-hosting"
              >
                Self-host Keenpix
              </a>{' '}
              — or read{' '}
              <a className="text-foreground underline" href="/compare">
                how Keenpix compares to Cloudinary, imgix, and others
              </a>
              .
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Billing questions, answered honestly
            </h2>
            <Accordion className="mt-6">
              {PRICING_FAQ.map((item) => (
                <AccordionItem key={item.question} value={item.question}>
                  <AccordionTrigger className="text-base">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
