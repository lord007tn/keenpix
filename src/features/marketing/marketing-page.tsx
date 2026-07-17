import { Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  ChartColumnIcon,
  CheckCircle2Icon,
  GitBranchIcon,
  GlobeIcon,
  ImageIcon,
  MenuIcon,
  ShieldCheckIcon,
  WalletIcon,
  ZapIcon,
} from 'lucide-react'
import { useState } from 'react'
import { CodeBlock } from '@/components/app/code-block'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  PLAN_CARD_FEATURES,
  PLAN_CARD_ORDER,
  PLAN_TAGLINES,
} from '@/features/marketing/plan-card-content'
import { catalogPricing, PLANS, type PlanPricing } from '@/lib/billing/plans'
import { cn } from '@/lib/cn/utils'
import { SOCIAL_X_URL } from '@/shared/authors'
import { MARKETING_FAQ } from '@/shared/marketing-faq'
import { REPOSITORY_URL } from '@/shared/repository'
import { FrameworkLogos } from './framework-logos'

// Drop a trailing `.00` so whole-dollar prices read as "$9" not "$9.00".
const TRAILING_ZEROS = /\.00$/
function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(TRAILING_ZEROS, '')}`
}

const FEATURES = [
  {
    icon: WalletIcon,
    title: 'No surprise bills',
    body: 'One published, linear overage rate — no pooled credits and no per-transform metering. Paid delivery stays online while usage accrues for the end-of-period invoice.',
  },
  {
    icon: GlobeIcon,
    title: 'Optimize your origins',
    body: 'Point Keenpix at your existing S3, R2, or any origin and keep your URLs — it sits behind the CDN you already run. No re-upload, no asset-library migration, no lock-in.',
  },
  {
    icon: ImageIcon,
    title: 'Modern formats from one URL',
    body: 'AVIF, WebP, JPEG, PNG, GIF, HEIF, TIFF, and SVG. Resize, crop, quality, and format from URL params — unlimited transforms on every plan.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'No API keys to leak',
    body: 'Per-project origin allowlists gate every request — nothing secret ships in your frontend. Add HMAC-signed URLs when you want hotlink protection, all on an SSRF-hardened pipeline.',
  },
  {
    icon: ChartColumnIcon,
    title: 'Analytics without another vendor',
    body: 'Requests, application response bytes and savings, format mix, cache hit rate, top assets, and latency — built in on every plan. Optional Cloudflare analytics reports upstream edge traffic separately.',
  },
  {
    icon: GitBranchIcon,
    title: 'Open-source escape hatch',
    body: 'Run the exact same engine yourself, free. Self-host with Docker and keep the whole pipeline on your own infrastructure.',
  },
]

// The lead "from $X/mo" metric is computed from live pricing in the component; the
// rest are static product facts.
const METRICS_TAIL = [
  ['Measured', 'source and delivered bytes per request'],
  ['14 days', 'free trial — no charge until it ends'],
]

const PIPELINE_STEPS = [
  'Validate project and allowlisted source host',
  'Fetch with SSRF, redirect, size, and timeout guards',
  'Transform with sharp and cache the exact variant',
  'Serve immutable output for CDN edge caching',
]

// Card content (order, taglines, cumulative feature lists) is shared with
// /pricing via plan-card-content.ts; prices come from live Polar pricing with
// the catalog as fallback — so the landing cards can never drift from checkout.

const NAV_LINKS = [
  { href: '#product', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
  { href: '#self-host', label: 'Self-host' },
  { href: '/blog', label: 'Blog' },
  { href: '/docs', label: 'Docs' },
  { href: REPOSITORY_URL, label: 'GitHub' },
]

// Below lg the header nav collapses to a hamburger drawer so phone and tablet
// visitors get a deliberate compact composition with comfortable touch targets.
function MobileNav() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        render={
          <Button
            aria-label="Open menu"
            className="size-12 touch-manipulation lg:hidden"
            size="icon"
            variant="ghost"
          />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent
        className="w-72 gap-0 [&_[data-slot=sheet-close]]:size-12"
        side="left"
      >
        <SheetHeader>
          <SheetTitle>
            <KeenpixLogo />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-0.5 p-3">
          {[...NAV_LINKS, { href: '/login', label: 'Sign in' }].map((link) => (
            <a
              className="flex min-h-12 touch-manipulation items-center rounded-md px-3 font-medium text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              href={link.href}
              key={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

export function MarketingPage({ pricing }: { pricing: PlanPricing | null }) {
  // Loader provides live pricing; fall back to the catalog so the page always
  // renders real numbers (and to satisfy the self-host-typed null).
  const prices = pricing ?? catalogPricing()
  const fromCents = Math.min(
    ...PLAN_CARD_ORDER.map((planId) => prices.plans[planId].month.amountCents),
  )
  const metrics = [
    [`from ${formatUsd(fromCents)}/mo`, 'or self-host free, forever'],
    ...METRICS_TAIL,
  ]
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <MobileNav />
          <KeenpixLogo className="min-w-0 shrink-0" />
          <nav className="ml-4 hidden gap-5 text-muted-foreground text-sm lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                className="hover:text-foreground"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
            <ModeToggle className="size-12 touch-manipulation" />
            <Link
              className={buttonVariants({
                className:
                  'max-sm:!hidden min-h-12 touch-manipulation px-3 sm:inline-flex',
                size: 'sm',
                variant: 'ghost',
              })}
              to="/login"
            >
              Sign in
            </Link>
            <Link
              className={buttonVariants({
                className:
                  'max-sm:!hidden min-h-12 touch-manipulation px-3 sm:inline-flex',
                size: 'sm',
              })}
              to="/signup"
            >
              Start free trial
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="relative isolate overflow-hidden border-b bg-[#06101f] text-white">
          <picture>
            <source srcSet="/brand/keenpix-hero.avif" type="image/avif" />
            <source srcSet="/brand/keenpix-hero.webp" type="image/webp" />
            <img
              alt=""
              aria-hidden="true"
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
              fetchPriority="high"
              height="630"
              src="/brand/keenpix-og.png"
              width="1200"
            />
          </picture>
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,16,31,0.96),rgba(6,16,31,0.82)_45%,rgba(6,16,31,0.28))]" />
          <div className="mx-auto grid min-h-[calc(100svh-10rem)] max-w-6xl content-center gap-10 px-6 py-16 sm:min-h-[560px] sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div className="mb-6 flex flex-wrap gap-2">
                <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" />
                  Managed cloud
                </Badge>
                <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                  Open-source self-host
                </Badge>
              </div>
              <h1 className="text-balance font-semibold text-4xl tracking-tight sm:text-5xl lg:text-6xl">
                Optimized images, minus the surprise bill.
              </h1>
              <p className="mt-5 max-w-xl text-balance text-lg text-white/80 leading-relaxed sm:text-xl">
                Keenpix transforms and delivers your images in modern formats
                from one URL — with one honest, published price. No pooled
                credits, no per-transform metering, and uninterrupted paid
                overage billed at the end of the period. Or self-host the whole
                thing, free.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className={buttonVariants({
                    className: 'min-h-12 touch-manipulation px-4',
                  })}
                  to="/signup"
                >
                  <ZapIcon data-icon="inline-start" />
                  Start free trial
                </Link>
                <a
                  className={buttonVariants({
                    className:
                      'min-h-12 touch-manipulation border-white/20 bg-white/10 px-4 text-white hover:bg-white/20 hover:text-white',
                    variant: 'outline',
                  })}
                  href="/docs/self-hosting"
                >
                  Self-host free
                </a>
              </div>
              <p className="mt-5 text-sm text-white/60">
                JoodCMS includes a first-party Keenpix image-delivery
                integration —{' '}
                <a
                  className="text-white/80 underline hover:text-white"
                  href="/blog/joodcms-keenpix-integration"
                >
                  read the code-backed case study
                </a>
                .
              </p>
              <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
                {metrics.map(([value, label]) => (
                  <div className="border-white/10 border-t pt-3" key={value}>
                    <div className="font-mono font-semibold text-white">
                      {value}
                    </div>
                    <div className="mt-1 text-white/60">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden items-end justify-end lg:flex">
              <div className="w-full max-w-md rounded-lg border border-white/10 bg-background/10 p-5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-white/10 border-b pb-4">
                  <div className="font-medium text-sm text-white">
                    Transform request
                  </div>
                  <Badge className="border-emerald-300/25 bg-emerald-300/15 text-emerald-100 hover:bg-emerald-300/15">
                    cached
                  </Badge>
                </div>
                <div className="mt-5 space-y-4 font-mono text-sm">
                  <div className="text-cyan-100">
                    GET /img/https://…/hero.jpg
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {['w=1200', 'fmt=auto', 'q=82'].map((param) => (
                      <span
                        className="rounded-md border border-white/10 bg-white/10 px-2 py-2 text-center text-white/80"
                        key={param}
                      >
                        {param}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-3 pt-2">
                    {[
                      'Allowlisted host validated',
                      'Fetched with SSRF guards',
                      'Transformed & variant cached',
                      'Served immutable for your CDN',
                    ].map((step) => (
                      <div className="flex items-start gap-3" key={step}>
                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                        <span className="text-white/70">{step}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-white/10 border-t pt-4 text-xs">
                    <div className="flex items-center justify-between text-white/60">
                      <span>hero.jpg · original</span>
                      <span>2.1 MB</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-white/15">
                      <div className="h-1.5 w-[23%] rounded-full bg-emerald-300" />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-emerald-200">
                        hero.avif · delivered
                      </span>
                      <span className="text-white">480 KB · 77% smaller</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b bg-background" id="frameworks">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <p className="text-center text-muted-foreground">
              <span className="font-medium text-foreground">
                No SDK — just a URL.
              </span>{' '}
              Keenpix drops into every framework you already use.
            </p>
            <div className="mt-10">
              <FrameworkLogos />
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30" id="product">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Product
                </span>
                <h2 className="mt-2 max-w-2xl font-semibold text-3xl tracking-tight md:text-4xl">
                  A managed image CDN that stays honest.
                </h2>
              </div>
              <p className="max-w-md text-muted-foreground leading-relaxed">
                Optimize the images you already host, deliver them fast in
                modern formats, and see exactly what you pay for — or run the
                whole open-source engine yourself.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <Card
                  className="rounded-lg transition-colors hover:bg-muted/40"
                  key={f.title}
                >
                  <CardContent className="flex min-h-52 flex-col gap-4">
                    <div className="flex size-10 items-center justify-center rounded-md bg-primary/12 text-primary ring-1 ring-primary/15">
                      <f.icon className="size-5" />
                    </div>
                    <h3 className="font-semibold text-lg">{f.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {f.body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b" id="pipeline">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Pipeline
              </span>
              <h2 className="font-semibold text-3xl tracking-tight">
                One predictable path from origin to optimized asset.
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Add an origin host to a project, request an image through
                <span className="font-mono"> /img/*</span>, and Keenpix handles
                validation, fetching, transform work, storage, logging, and
                cache headers.
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {PIPELINE_STEPS.map((step, index) => (
                  <div
                    className="flex items-center gap-3 border-b border-dashed py-3 text-sm"
                    key={step}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary font-mono font-semibold text-secondary-foreground text-xs">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <CodeBlock>{`<img
  src="https://keenpix.example.com/img/https://cdn.example.com/hero.jpg?project=site&w=1200&fmt=webp&q=82"
  width="1200"
  height="800"
  alt="Product hero"
/>

# response
Cache-Control: public, max-age=31536000, immutable
Vary: Accept`}</CodeBlock>
          </div>
        </section>

        <section className="border-b bg-muted/30" id="pricing">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Pricing
                </span>
                <h2 className="mt-2 max-w-2xl font-semibold text-3xl tracking-tight md:text-4xl">
                  One honest meter. Or free forever.
                </h2>
              </div>
              <p className="max-w-md text-muted-foreground leading-relaxed">
                Every plan bills on bytes returned by Keenpix — never per
                transform. Upstream CDN edge hits are not added to the meter.
                Overage is one linear published rate and paid delivery remains
                online throughout the billing period. Every plan starts with a
                14-day free trial.
              </p>
            </div>
            <div className="grid items-stretch gap-4 lg:grid-cols-3">
              {PLAN_CARD_ORDER.map((planId) => {
                const plan = PLANS[planId]
                const card = PLAN_CARD_FEATURES[planId]
                const featured = planId === 'pro'
                return (
                  <Card
                    className={cn(
                      'rounded-lg',
                      featured && 'ring-2 ring-primary',
                    )}
                    key={planId}
                  >
                    <CardContent className="flex h-full flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        {featured ? (
                          <Badge className="bg-primary/12 text-primary hover:bg-primary/12">
                            Most popular
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-baseline gap-1">
                          <span className="font-semibold text-4xl tracking-tight">
                            {formatUsd(prices.plans[planId].month.amountCents)}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            /mo
                          </span>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {PLAN_TAGLINES[planId]}
                      </p>
                      {card.lead ? (
                        <p className="font-medium text-foreground text-sm">
                          {card.lead}
                        </p>
                      ) : null}
                      <ul className="flex flex-col gap-2.5 text-sm">
                        {card.features.map((feature) => (
                          <li
                            className="flex items-start gap-2.5"
                            key={feature}
                          >
                            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span className="text-muted-foreground">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        className={buttonVariants({
                          className:
                            'mt-auto min-h-12 w-full touch-manipulation',
                          variant: featured ? 'default' : 'outline',
                        })}
                        to="/signup"
                      >
                        Start free trial
                      </Link>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <p className="mt-6 text-center text-muted-foreground text-sm">
              Prefer to run it yourself?{' '}
              <a
                className="text-foreground underline"
                href="/docs/self-hosting"
              >
                Self-host Keenpix free
              </a>{' '}
              — the same open-source engine, on your own infrastructure.
            </p>
          </div>
        </section>

        <section className="border-b" id="self-host">
          <div className="mx-auto grid min-w-0 max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="min-w-0">
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Self-host
              </span>
              <h2 className="mt-2 font-semibold text-3xl tracking-tight md:text-4xl">
                Never locked in. Run the same engine yourself.
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                The Keenpix engine is open source under AGPL — dashboard,
                analytics, and signed URLs included, no telemetry, no CLA.
                Deploy it with Docker, keep the image pipeline on your own
                infrastructure, and pay nothing.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  className={buttonVariants({
                    className: 'min-h-12 touch-manipulation px-4',
                  })}
                  href="/docs/self-hosting"
                >
                  Deploy with Docker
                  <ArrowRightIcon data-icon="inline-end" />
                </a>
                <a
                  className={buttonVariants({
                    className: 'min-h-12 touch-manipulation px-4',
                    variant: 'outline',
                  })}
                  href={REPOSITORY_URL}
                  rel="noreferrer"
                  target="_blank"
                >
                  View on GitHub
                </a>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              <CodeBlock>{`cp .env.example .env   # set secrets + admin login
docker compose up -d   # app + Postgres, migrated and seeded
open http://localhost:3000`}</CodeBlock>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  [
                    'Docker Compose',
                    'App, Postgres, migrations, seed, and healthcheck.',
                  ],
                  [
                    'Coolify ready',
                    'A dedicated compose file with generated secrets.',
                  ],
                  [
                    'CDN friendly',
                    'Put any edge cache in front of /img/* and keep control.',
                  ],
                ].map(([title, body]) => (
                  <div
                    className="border-border border-l pl-4 text-sm"
                    key={title}
                  >
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-2 text-muted-foreground leading-relaxed">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b" id="faq">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <div className="mb-10 flex flex-col gap-3">
              <span className="font-medium text-primary text-sm tracking-wide">
                FAQ
              </span>
              <h2 className="font-semibold text-3xl tracking-tight md:text-4xl">
                Frequently asked questions
              </h2>
            </div>
            <Accordion>
              {MARKETING_FAQ.map((item) => (
                <AccordionItem key={item.question} value={item.question}>
                  <AccordionTrigger className="py-5 text-lg">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {item.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-14 md:flex-row md:items-center">
            <div>
              <h2 className="font-semibold text-3xl tracking-tight">
                Start delivering optimized images today.
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Spin up a project in minutes on managed cloud, or self-host the
                open-source engine — no lock-in either way. Every plan starts
                with a 14-day free trial, and trial usage is never billed.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className={buttonVariants({
                  className: 'min-h-12 touch-manipulation px-4',
                })}
                to="/signup"
              >
                Start free trial
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
              <a
                className={buttonVariants({
                  className: 'min-h-12 touch-manipulation px-4',
                  variant: 'outline',
                })}
                href="/docs/self-hosting"
              >
                Self-hosting guide
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-6 py-8 text-muted-foreground text-sm md:flex-row md:items-center md:justify-between">
          <KeenpixLogo />
          <span className="font-mono text-xs md:order-last">
            © 2026 keenpix · managed cloud + open-source self-host
          </span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a className="hover:text-foreground" href="/about">
              About
            </a>
            <a className="hover:text-foreground" href="/pricing">
              Pricing
            </a>
            <a className="hover:text-foreground" href="/compare">
              Compare
            </a>
            <a className="hover:text-foreground" href="/changelog">
              Changelog
            </a>
            <a className="hover:text-foreground" href="/blog">
              Blog
            </a>
            <a className="hover:text-foreground" href="/docs">
              Docs
            </a>
            <a className="hover:text-foreground" href="/legal/terms">
              Terms
            </a>
            <a className="hover:text-foreground" href="/legal/privacy">
              Privacy
            </a>
            <a
              className="hover:text-foreground"
              href={REPOSITORY_URL}
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <a
              className="hover:text-foreground"
              href={SOCIAL_X_URL}
              rel="noreferrer"
              target="_blank"
            >
              X
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
