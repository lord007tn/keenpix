import { Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  ChartColumnIcon,
  CheckCircle2Icon,
  CpuIcon,
  DatabaseIcon,
  ImageIcon,
  LayersIcon,
  ShieldIcon,
  ZapIcon,
} from 'lucide-react'
import { CodeBlock } from '@/components/app/code-block'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const FEATURES = [
  {
    icon: ImageIcon,
    title: 'Modern formats from one URL',
    body: 'Generate AVIF, WebP, JPEG, and PNG variants with width, height, quality, fit, DPR, and blur controls.',
  },
  {
    icon: ChartColumnIcon,
    title: 'Analytics without another vendor',
    body: 'Track requests, bandwidth saved, format mix, cache hit rate, top assets, and latency from the built-in request log.',
  },
  {
    icon: ShieldIcon,
    title: 'Allowlist-first security',
    body: 'Per-project host allowlists, private network blocking, DNS rebinding checks, and response limits keep the proxy locked down.',
  },
  {
    icon: DatabaseIcon,
    title: 'Postgres-backed control plane',
    body: 'Projects, settings, staff access, request logs, and analytics all live in a database you control.',
  },
  {
    icon: LayersIcon,
    title: 'Disk cache built for CDNs',
    body: 'Keenpix stores transformed variants locally and serves immutable responses that CDN edges can cache aggressively.',
  },
  {
    icon: CpuIcon,
    title: 'Self-hosted operations',
    body: 'Run the included Docker Compose stack, deploy with Coolify, and keep the image pipeline on your own infrastructure.',
  },
]

const METRICS = [
  ['0 keys', 'source access is gated by allowlisted hosts'],
  ['4 formats', 'AVIF, WebP, JPEG, and PNG output'],
  ['1 path', '/img/<source>?project=<id>&w=600'],
]

const PIPELINE_STEPS = [
  'Validate project and allowlisted source host',
  'Fetch with SSRF, redirect, size, and timeout guards',
  'Transform with sharp and cache the exact variant',
  'Serve immutable output for CDN edge caching',
]

export function MarketingPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
          <KeenpixLogo />
          <nav className="ml-4 hidden gap-5 text-muted-foreground text-sm md:flex">
            <a className="hover:text-foreground" href="#product">
              Product
            </a>
            <a className="hover:text-foreground" href="#pipeline">
              Pipeline
            </a>
            <a className="hover:text-foreground" href="#self-host">
              Self-host
            </a>
            <a href="/docs">Docs</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
            <Link
              className={buttonVariants({
                className: 'hidden sm:inline-flex',
                size: 'sm',
                variant: 'ghost',
              })}
              to="/login"
            >
              Sign in
            </Link>
            <Link className={buttonVariants({ size: 'sm' })} to="/login">
              Dashboard
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="relative isolate overflow-hidden border-b bg-[#06101f] text-white">
          <img
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
            height="630"
            src="/brand/keenpix-og.png"
            width="1200"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,16,31,0.96),rgba(6,16,31,0.82)_45%,rgba(6,16,31,0.28))]" />
          <div className="mx-auto grid min-h-[calc(100svh-10rem)] max-w-6xl content-center gap-10 px-6 py-16 sm:min-h-[560px] sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div className="mb-6 flex flex-wrap gap-2">
                <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" />
                  Apache-2.0 licensed
                </Badge>
                <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                  self-hosted
                </Badge>
              </div>
              <h1 className="text-balance font-semibold text-5xl tracking-tight sm:text-6xl lg:text-7xl">
                Keenpix
              </h1>
              <p className="mt-5 max-w-xl text-balance text-lg text-white/80 leading-relaxed sm:text-xl">
                A fast, open-source image optimization layer you can host
                yourself. Transform remote images with sharp, cache every
                variant, and serve CDN-ready assets from one URL.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link className={buttonVariants()} to="/login">
                  <ZapIcon data-icon="inline-start" />
                  Start optimizing
                </Link>
                <a
                  className={buttonVariants({
                    className:
                      'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white',
                    variant: 'outline',
                  })}
                  href="/docs"
                >
                  Read the docs
                </a>
              </div>
              <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
                {METRICS.map(([value, label]) => (
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
              <div className="w-full max-w-md border border-white/10 bg-background/10 p-5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-white/10 border-b pb-4">
                  <div className="font-medium text-sm text-white">
                    Transform request
                  </div>
                  <Badge className="border-emerald-300/25 bg-emerald-300/15 text-emerald-100 hover:bg-emerald-300/15">
                    cached
                  </Badge>
                </div>
                <div className="mt-5 space-y-4 font-mono text-sm">
                  <div className="text-cyan-100">GET /img/https://...</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {['w=1200', 'fmt=webp', 'q=82'].map((param) => (
                      <span
                        className="border border-white/10 bg-white/10 px-2 py-2 text-center text-white/80"
                        key={param}
                      >
                        {param}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-3 pt-2">
                    {PIPELINE_STEPS.map((step) => (
                      <div className="flex items-start gap-3" key={step}>
                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                        <span className="text-white/70">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
                  A practical image CDN core, packaged for your stack.
                </h2>
              </div>
              <p className="max-w-md text-muted-foreground leading-relaxed">
                Keenpix keeps the public surface small: one transform endpoint,
                strict source validation, and an admin dashboard for operations.
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
                    <div className="font-semibold text-lg">{f.title}</div>
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

        <section className="bg-muted/30" id="self-host">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Self-host
              </span>
              <h2 className="mt-2 font-semibold text-3xl tracking-tight md:text-4xl">
                Own the image layer your product depends on.
              </h2>
            </div>
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
                  <div className="font-semibold">{title}</div>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-background">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-14 md:flex-row md:items-center">
            <div>
              <h2 className="font-semibold text-3xl tracking-tight">
                Run Keenpix on your infrastructure.
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Start with Docker locally, then put the same app behind your
                preferred proxy or CDN.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                className={buttonVariants({ variant: 'outline' })}
                href="/docs/self-hosting"
              >
                Self-hosting guide
              </a>
              <Link className={buttonVariants()} to="/login">
                Open dashboard
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-muted-foreground text-sm">
          <KeenpixLogo />
          <span className="font-mono text-xs">© 2026 keenpix · Apache-2.0</span>
          <a className="hover:text-foreground" href="/docs">
            Documentation
          </a>
        </div>
      </footer>
    </div>
  )
}
