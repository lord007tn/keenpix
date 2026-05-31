import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  ChartColumnIcon,
  CpuIcon,
  GlobeIcon,
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
import { getPublicConfigFn } from '@/functions/config'
import {
  absoluteUrl,
  SITE_DESCRIPTION,
  softwareApplicationJsonLd,
} from '@/lib/seo'

export const Route = createFileRoute('/')({
  head: ({ loaderData }) => {
    if (loaderData?.selfHost) {
      return {
        meta: [
          { title: 'Self-hosted Keenpix' },
          { name: 'robots', content: 'noindex,nofollow' },
        ],
      }
    }

    const title = 'Keenpix - self-hosted image optimization'

    return {
      headScripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(softwareApplicationJsonLd()),
        },
      ],
      links: [{ rel: 'canonical', href: absoluteUrl('/') }],
      meta: [
        { title },
        { name: 'description', content: SITE_DESCRIPTION },
        { property: 'og:title', content: title },
        { property: 'og:description', content: SITE_DESCRIPTION },
        { property: 'og:url', content: absoluteUrl('/') },
        { property: 'og:image', content: absoluteUrl('/brand/keenpix-og.png') },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: SITE_DESCRIPTION },
        {
          name: 'twitter:image',
          content: absoluteUrl('/brand/keenpix-og.png'),
        },
      ],
    }
  },
  loader: () => getPublicConfigFn(),
  component: Home,
})

function Home() {
  const { selfHost } = Route.useLoaderData()
  return selfHost ? <SelfHostHome /> : <MarketingPage />
}

/** Shown instead of the marketing site when KEENPIX_SELF_HOST is enabled. */
function SelfHostHome() {
  return (
    <div
      className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 text-center"
      id="main-content"
    >
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <KeenpixLogo />
      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl tracking-tight">
          Self-hosted Keenpix
        </h1>
        <p className="max-w-md text-balance text-muted-foreground">
          This is a private, self-hosted image-optimization instance. Sign in to
          manage your projects and analytics.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link className={buttonVariants()} to="/app">
          Go to dashboard
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
        <a className={buttonVariants({ variant: 'outline' })} href="/docs">
          Read docs
        </a>
      </div>
    </div>
  )
}

const FEATURES = [
  {
    icon: ZapIcon,
    title: 'Edge-tuned by default',
    body: 'AVIF, WebP and JPEG generated on first request, cached forever. Format auto-negotiated per request, baked into the URL so any CDN stays correct.',
  },
  {
    icon: ChartColumnIcon,
    title: 'Analytics built in',
    body: 'Bandwidth saved, format distribution, cache hit rate, top images, latency — read straight from your request logs. No Grafana installer.',
  },
  {
    icon: CpuIcon,
    title: 'Drop-in for any framework',
    body: 'Next.js, Astro, Remix, or plain <img>. One endpoint, one env var, keep your existing tags.',
  },
  {
    icon: ShieldIcon,
    title: 'Safe by construction',
    body: 'Per-project origin allowlist + private-IP blocking stop SSRF and hotlinkers before a byte is fetched.',
  },
  {
    icon: LayersIcon,
    title: 'Caches you can reason about',
    body: 'Content-addressed disk cache with HIT/MISS headers. Front it with Cloudflare and your origin barely wakes up.',
  },
  {
    icon: GlobeIcon,
    title: 'Yours to host',
    body: 'One Node container, Postgres, sharp. docker compose up and own your image layer.',
  },
]

function MarketingPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
          <KeenpixLogo />
          <nav className="ml-4 hidden gap-5 text-muted-foreground text-sm md:flex">
            <span>Product</span>
            <span>Analytics</span>
            <span>Self-host</span>
            <a href="/docs">Docs</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
            <Link
              className={buttonVariants({ size: 'sm', variant: 'ghost' })}
              to="/login"
            >
              Sign in
            </Link>
            <Link className={buttonVariants({ size: 'sm' })} to="/login">
              Try the dashboard
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden border-b">
          <div
            className="pointer-events-none absolute top-[-120px] left-1/2 h-[420px] w-[760px] -translate-x-1/2 opacity-60"
            style={{
              background:
                'radial-gradient(ellipse, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)',
            }}
          />
          <div className="relative mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
            <div className="mb-6 flex justify-center gap-2">
              <Badge variant="success">
                <span className="size-1.5 animate-pulse rounded-full bg-current" />
                MIT licensed
              </Badge>
              <Badge variant="secondary">self-hosted</Badge>
            </div>
            <h1 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl md:text-5xl">
              Image optimization,{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, var(--chart-1), var(--chart-2))',
                }}
              >
                on your own metal.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
              A drop-in image pipeline for any framework. Self-hosted, open
              source, and shipped with the analytics you actually wanted from
              your CDN.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link className={buttonVariants()} to="/login">
                <ZapIcon data-icon="inline-start" />
                Start optimizing
              </Link>
              <a
                className={buttonVariants({ variant: 'outline' })}
                href="/docs"
              >
                Read the docs
              </a>
            </div>
            <div className="mt-6 font-mono text-muted-foreground text-xs">
              $ docker compose up
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="mb-10 max-w-xl font-semibold text-3xl tracking-tight">
              Everything an image CDN should be, nothing more.
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <Card key={f.title}>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex size-9 items-center justify-center rounded-md bg-primary/12 text-primary">
                      <f.icon className="size-5" />
                    </div>
                    <div className="font-semibold">{f.title}</div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {f.body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Self-host
              </span>
              <h2 className="font-semibold text-3xl tracking-tight">
                Own your image layer.
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                One Node container, your Postgres, sharp under the hood. Bring
                your own object storage or use the local disk. No per-image fee,
                ever.
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {[
                  ['1 container', 'app + sharp'],
                  ['Postgres', 'projects, allowlists, logs'],
                  ['MIT', 'use it forever'],
                ].map(([k, v]) => (
                  <div
                    className="flex justify-between border-b border-dashed py-2 text-sm"
                    key={k}
                  >
                    <span className="font-mono font-semibold">{k}</span>
                    <span className="text-muted-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <CodeBlock>{`# clone, then:
docker compose up --build

✓ postgres ready on :5432
✓ keenpix listening on http://0.0.0.0:3000
  cache: /var/cache/keenpix
  open http://localhost:3000`}</CodeBlock>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <Card
            className="overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in oklab, var(--primary) 8%, transparent), color-mix(in oklab, var(--chart-2) 8%, transparent))',
            }}
          >
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <h2 className="font-semibold text-3xl tracking-tight">
                Free forever. Self-hosted.
              </h2>
              <p className="max-w-md text-muted-foreground">
                No SaaS plan, no per-image fee, no usage cap. Spin it up and
                ship.
              </p>
              <Link className={buttonVariants()} to="/login">
                Open the dashboard
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-muted-foreground text-sm">
          <KeenpixLogo />
          <span className="font-mono text-xs">© 2026 keenpix · MIT</span>
          <a className="hover:text-foreground" href="/docs">
            Documentation
          </a>
        </div>
      </footer>
    </div>
  )
}
