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
  loader: () => getPublicConfigFn(),
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
    title: 'Sharp transforms on first request',
    body: 'AVIF, WebP, JPEG, and PNG are generated with sharp, cached on disk, and served with immutable headers for your CDN.',
  },
  {
    icon: ChartColumnIcon,
    title: 'Analytics built in',
    body: 'Requests, bandwidth saved, format distribution, cache hit rate, top images, and latency come straight from request logs.',
  },
  {
    icon: CpuIcon,
    title: 'Drop-in for any framework',
    body: 'Next.js, Astro, Remix, or plain <img>. One keyless endpoint with a source URL, project, and optional transform params.',
  },
  {
    icon: ShieldIcon,
    title: 'Allowlist guarded',
    body: 'Per-project origin allowlists and private-IP blocking stop unsafe source URLs before an origin fetch happens.',
  },
  {
    icon: LayersIcon,
    title: 'Disk cache you can reason about',
    body: 'Transform results are cached on local disk. Put a CDN in front of /img/* and cache immutable responses.',
  },
  {
    icon: GlobeIcon,
    title: 'Yours to host',
    body: 'Use the included Docker Compose stack, or import the same compose setup into Coolify with the required env values.',
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
              Dashboard
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden border-b">
          <div className="relative mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
            <div className="mb-6 flex justify-center gap-2">
              <Badge variant="success">
                <span className="size-1.5 animate-pulse rounded-full bg-current" />
                MIT licensed
              </Badge>
              <Badge variant="secondary">self-hosted</Badge>
            </div>
            <h1 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl md:text-5xl">
              Self-hosted image optimization,{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, var(--chart-1), var(--chart-2))',
                }}
              >
                behind one URL.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
              Fetch allowlisted origin images, transform them with sharp, cache
              results on disk, and serve CDN-friendly AVIF, WebP, JPEG, or PNG
              responses from a single endpoint.
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
              Self-host docs: /docs/self-hosting
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
                One Node container, Postgres, sharp, and a local disk cache. Put
                a CDN in front of /img/*, or deploy the included Compose stack
                through Coolify and operate the image pipeline on your
                infrastructure.
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {[
                  ['1 container', 'app + sharp'],
                  ['Postgres', 'projects, allowlists, logs'],
                  ['Disk cache', 'cached transform output'],
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
            <CodeBlock>{`# Docker Compose
cp .env.example .env
# set POSTGRES_PASSWORD, BETTER_AUTH_SECRET,
# BETTER_AUTH_URL, VITE_KEENPIX_PUBLIC_URL,
# KEENPIX_SUPER_ADMIN_EMAIL, KEENPIX_SUPER_ADMIN_PASSWORD
docker compose up -d

# Coolify
Create a Docker Compose resource from the repo.
Set the same env values, expose app:3000,
and point BETTER_AUTH_URL + VITE_KEENPIX_PUBLIC_URL
to your Coolify domain.`}</CodeBlock>
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
                Self-hosted by design.
              </h2>
              <p className="max-w-md text-muted-foreground">
                Run the transform API, security checks, disk cache, and
                dashboard on infrastructure you control.
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
