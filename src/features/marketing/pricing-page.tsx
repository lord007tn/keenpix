import { Link } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'
import { useState } from 'react'
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
  catalogPricing,
  PLANS,
  type PlanId,
  type PlanPricing,
  TRIAL,
} from '@/lib/billing/plans'
import { cn } from '@/lib/cn/utils'

type Interval = 'month' | 'year'

const GB = 1024 ** 3
const PLAN_ORDER: PlanId[] = ['basic', 'pro', 'business']
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
      'One meter: gigabytes delivered to your users. Transformations, responsive variants, and modern-format conversion are unlimited and free on every plan. There are no per-image, per-transform, per-request, or storage charges — Keenpix has no storage; it optimizes and delivers from origins you already have.',
  },
  {
    question: 'How does the free trial work?',
    answer: `Every plan starts with a ${TRIAL.days}-day free trial (card required, powered by Polar). You get the plan's full features with up to ${TRIAL.maxProjects} projects and ${gb(TRIAL.bandwidthBytes)} delivered, and trial usage is never billed — metering starts only when the trial converts. Polar emails you before the first charge and you can cancel anytime.`,
  },
  {
    question: 'What happens when I use more than my included bandwidth?',
    answer: `Delivery keeps working and additional gigabytes are billed at your plan's single published overage rate ($${(PLANS.basic.overagePerGbCents / 100).toFixed(2)}/GB on Basic, $${(PLANS.pro.overagePerGbCents / 100).toFixed(2)} on Pro, $${(PLANS.business.overagePerGbCents / 100).toFixed(2)} on Business) — no tiers, no penalty pricing. Overage accrues only up to your spending cap.`,
  },
  {
    question: 'What is the spending cap and what happens when I hit it?',
    answer:
      'Every new subscription starts with a hard overage spending cap of 2× your plan price — you can raise, lower, or remove it in billing settings. If your accrued overage cost reaches the cap, image delivery pauses for the rest of the period (your account is never suspended, and delivery resumes the moment you raise the cap or the period rolls over). You get an email at 80% and at the cap.',
  },
  {
    question: 'What happens if my payment fails?',
    answer:
      'Nothing breaks immediately. Keenpix keeps serving your images through a dunning grace window while Polar retries the payment, and you get an email right away. Delivery only stops if billing stays unresolved and the subscription ends.',
  },
  {
    question: 'How does annual billing work?',
    answer:
      'Annual plans cost 10× the monthly price — two months free. Plan switches are prorated by Polar and take effect immediately.',
  },
  {
    question: 'Is self-hosting really free?',
    answer:
      'Yes. The entire engine — transform pipeline, dashboard, analytics, allowlists, signed URLs — is open source under AGPL-3.0 with no feature gates, no telemetry, and no CLA. You run it on your own infrastructure with one Docker Compose command and pay only for your own servers. The managed cloud exists for teams who would rather not operate it.',
  },
]

const MATRIX: Array<{
  feature: string
  values: [string, string, string, string] // self-host, basic, pro, business
}> = [
  {
    feature: 'Included delivery / month',
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
    values: ['Full (Postgres)', 'Core', 'Advanced', 'Advanced'],
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
    feature: 'Hard spending cap',
    values: ['—', 'On by default', 'On by default', 'On by default'],
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
    values: ['Your domain', 'Coming soon', 'Coming soon', 'Coming soon'],
  },
  {
    feature: 'Ops, upgrades, backups',
    values: ['You', 'Managed', 'Managed', 'Managed'],
  },
]

const TAGLINES: Record<PlanId, string> = {
  basic: 'For a site or store getting started.',
  pro: 'Advanced analytics and full log history.',
  business: 'One plan for all your client sites.',
}

// Per-plan card features, cumulative ("Everything in X, plus") so each card
// reads as an upgrade path instead of three near-identical lists. Numbers
// derive from the plans catalog so the cards can never drift from checkout.
const CARD_FEATURES: Record<PlanId, { features: string[]; lead?: string }> = {
  basic: {
    features: [
      `${gb(PLANS.basic.includedBandwidthBytes)} delivered / month`,
      'Unlimited transforms — AVIF, WebP + 6 more formats',
      `${PLANS.basic.maxProjects} projects`,
      'Bandwidth-saved, cache-hit & top-image analytics',
      `Live request logs · ${PLANS.basic.logRetentionDays}-day retention`,
      'Signed URLs + per-project allowlists',
      `Spending cap on by default · $${(PLANS.basic.overagePerGbCents / 100).toFixed(2)}/GB overage`,
    ],
  },
  pro: {
    lead: 'Everything in Basic, plus:',
    features: [
      `${gb(PLANS.pro.includedBandwidthBytes)} delivered / month`,
      'Advanced analytics — geo, latency percentiles, full history',
      `Full log search · ${PLANS.pro.logRetentionDays}-day retention`,
      `${PLANS.pro.maxProjects} projects`,
      `Cheaper overage · $${(PLANS.pro.overagePerGbCents / 100).toFixed(2)}/GB, hard-capped`,
    ],
  },
  business: {
    lead: 'Everything in Pro, plus:',
    features: [
      `${gb(PLANS.business.includedBandwidthBytes)} delivered / month`,
      'Unlimited projects',
      `${PLANS.business.logRetentionDays}-day log retention`,
      `Lowest overage · $${(PLANS.business.overagePerGbCents / 100).toFixed(2)}/GB, hard-capped`,
    ],
  },
}

export function PricingPage({ pricing }: { pricing: PlanPricing | null }) {
  const [interval, setInterval] = useState<Interval>('month')
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
              One honest meter: bandwidth delivered.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed">
              Unlimited transforms on every plan. A single published overage
              rate with a hard cap, on by default. A {TRIAL.days}-day free trial
              that is never billed. Or self-host the whole engine, free.
            </p>

            <div className="mt-8 inline-flex items-center gap-1 rounded-lg bg-muted p-1">
              {(['month', 'year'] as const).map((value) => (
                <button
                  className={cn(
                    'flex items-center gap-2 rounded-md px-4 py-1.5 font-medium text-sm transition-colors',
                    interval === value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  key={value}
                  onClick={() => setInterval(value)}
                  type="button"
                >
                  {value === 'month' ? 'Monthly' : 'Annual'}
                  {value === 'year' ? (
                    <Badge variant="success">2 months free</Badge>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-4 text-left lg:grid-cols-3">
              {PLAN_ORDER.map((planId) => {
                const plan = PLANS[planId]
                const price = prices.plans[planId]
                const monthlyCents =
                  interval === 'year'
                    ? price.year.amountCents / 12
                    : price.month.amountCents
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
                      {interval === 'year' ? (
                        <p className="text-muted-foreground text-sm">
                          Billed ${formatUsd(price.year.amountCents)}/year
                        </p>
                      ) : null}
                      <p className="text-muted-foreground text-sm">
                        {TAGLINES[planId]}
                      </p>
                      {CARD_FEATURES[planId].lead ? (
                        <p className="font-medium text-foreground text-sm">
                          {CARD_FEATURES[planId].lead}
                        </p>
                      ) : null}
                      <ul className="flex flex-col gap-2 text-sm">
                        {CARD_FEATURES[planId].features.map((feature) => (
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
                          className: 'mt-auto w-full',
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
                    {PLAN_ORDER.map((planId) => (
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
