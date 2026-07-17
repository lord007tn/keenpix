import { Link } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'
import {
  PLAN_CARD_FEATURES,
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

// Pricing-specific FAQ, rendered visibly AND emitted as FAQPage JSON-LD by the
// route. Every number derives from the plans catalog so it can't drift.
export const PRICING_FAQ: Array<{ answer: string; question: string }> = [
  {
    question: 'What exactly am I billed for?',
    answer:
      'One meter: optimized response bytes returned by the Keenpix application. Transformations, responsive variants, and modern-format conversion are unlimited on every plan. There are no per-image, per-transform, per-request, or storage charges — Keenpix has no asset storage; it returns optimized images from origins you already have. If an upstream Cloudflare cache serves an edge HIT, that request never reaches Keenpix and is not in the billing meter. Optional Cloudflare analytics reports edge traffic separately.',
  },
  {
    question: 'How does the free trial work?',
    answer: `Every plan starts with a ${TRIAL.days}-day free trial (card required, powered by Polar). You get the plan's full features with up to ${TRIAL.maxProjects} projects and ${gb(TRIAL.bandwidthBytes)} delivered, and trial usage is never billed — metering starts only when the trial converts. Polar emails you before the first charge and you can cancel anytime.`,
  },
  {
    question: 'What happens when I use more than my included bandwidth?',
    answer: `Delivery keeps working and additional gigabytes are billed at your plan's single published overage rate ($${(PLANS.basic.overagePerGbCents / 100).toFixed(2)}/GB on Basic, $${(PLANS.pro.overagePerGbCents / 100).toFixed(2)} on Pro, $${(PLANS.business.overagePerGbCents / 100).toFixed(2)} on Business) — no tiers or penalty pricing. Polar charges accumulated usage at the end of the billing period.`,
  },
  {
    question: 'Can overage take my images offline?',
    answer:
      'No. Basic, Pro, and Business continue serving after their included bandwidth is used. The dashboard shows estimated overage and Keenpix emails you as usage approaches and passes the included allowance. Only an ended subscription, an exhausted free trial, or a separate fraud or abuse intervention stops delivery.',
  },
  {
    question: 'What happens if my payment fails?',
    answer:
      'Nothing breaks immediately. Keenpix keeps serving your images through a dunning grace window while Polar retries the payment, and you get an email right away. Delivery only stops if billing stays unresolved and the subscription ends.',
  },
  {
    question: 'Is self-hosting really free?',
    answer:
      'Yes. The entire engine — transform pipeline, dashboard, analytics, allowlists, signed URLs — is open source under AGPL-3.0 with no feature gates, no telemetry, and no CLA. You run it on your own infrastructure with one Docker Compose command and pay only for your own servers. The managed cloud exists for teams who would rather not operate it.',
  },
]

// (Card content — order, taglines, features — lives in plan-card-content.ts,
// shared with the landing page so the two card sets can never drift.)

const MATRIX: Array<{
  feature: string
  values: [string, string, string, string] // self-host, basic, pro, business
}> = [
  {
    feature: 'Included Keenpix response bytes / month',
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
  const prices = pricing ?? catalogPricing()

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
              One meter: bytes returned by Keenpix.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed">
              Unlimited transforms on every plan. A single published overage
              rate, metered through the period without interrupting delivery. A{' '}
              {TRIAL.days}-day free trial that is never billed. Or self-host the
              whole engine, free.
            </p>

            <div className="mt-8 grid gap-4 text-left lg:grid-cols-3">
              {PLAN_CARD_ORDER.map((planId) => {
                const plan = PLANS[planId]
                const price = prices.plans[planId]
                const monthlyCents = price.month.amountCents
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
                      {PLAN_CARD_FEATURES[planId].lead ? (
                        <p className="font-medium text-foreground text-sm">
                          {PLAN_CARD_FEATURES[planId].lead}
                        </p>
                      ) : null}
                      <ul className="flex flex-col gap-2 text-sm">
                        {PLAN_CARD_FEATURES[planId].features.map((feature) => (
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
              Compare every tier — including free
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Self-host is a real tier, not a demo: the same AGPL engine with
              nothing held back. The cloud sells operations, not features.
            </p>
            <div className="mt-8 overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-56" />
                    <TableHead>Self-host (free)</TableHead>
                    <TableHead>Basic</TableHead>
                    <TableHead>Pro</TableHead>
                    <TableHead>Business</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Price</TableCell>
                    <TableCell>$0 · AGPL-3.0</TableCell>
                    {PLAN_CARD_ORDER.map((planId) => (
                      <TableCell key={planId}>
                        ${PLANS[planId].priceMonthlyUsd}/mo
                      </TableCell>
                    ))}
                  </TableRow>
                  {MATRIX.map((row) => (
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
                Self-host Keenpix free
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
