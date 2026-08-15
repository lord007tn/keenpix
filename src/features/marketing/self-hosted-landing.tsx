import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { CodeBlock } from '@/components/app/code-block'
import { buttonVariants } from '@/components/ui/button'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'

// Rendered visibly in the FAQ section by the
// /self-hosted-image-cdn route (Google requires the answers to be on the page).
const SELF_HOSTED_FAQ: Array<{ answer: string; question: string }> = [
  {
    question: 'Is the self-hosted version really free?',
    answer:
      'The current v0.2.1 source is AGPL-3.0, with no Keenpix license fee, team-member limit, transform limit, or telemetry. You operate and pay for the infrastructure. Managed cloud starts at $9/month for 100 GB of managed image delivery with unlimited transformations and team members (as of August 2026).',
  },
  {
    question: 'How does Keenpix compare to imgproxy?',
    answer:
      'imgproxy is an excellent transform engine, and its open-source version includes more than people give it credit for — basic watermarks and basic smart crop are OSS, not Pro. What it deliberately does not include: a dashboard, analytics, or a cache layer — you assemble those yourself. Keenpix ships the assembled system: transforms plus two-tier caching, UI-managed per-project allowlists, and bandwidth, cache-hit, and latency analytics, in one container. If you want a headless building block, choose imgproxy. If you want the finished pipeline, choose Keenpix.',
  },
  {
    question: 'Does Keenpix replace my CDN?',
    answer:
      'No — it complements it. Keenpix is the origin shield that sits behind Cloudflare (or any CDN) and generates the optimized variants your edge then caches. Transform responses are emitted with long-lived immutable cache headers, so a cache rule on /img/* lets the edge handle repeat requests without reaching Keenpix. Your CDN may still charge for its own delivery.',
  },
  {
    question: 'Where do my images live?',
    answer:
      'Wherever they live now. Keenpix has no upload step and no storage — it fetches from your existing origins (only ones you have allowlisted), transforms, caches, and delivers. Removing Keenpix later means removing a URL prefix, not migrating a media library. That is deliberate: the easier we make leaving, the less you have to trust us.',
  },
  {
    question: 'Can I move to the managed cloud later?',
    answer:
      'The v0.2.1 cloud and self-host deployment paths share the transform URL grammar. Moving still requires a planned hostname, configuration, cache, database, and traffic migration; it is not only a DNS switch. Validate both directions with canary traffic before cutover.',
  },
]

const WHY_SELF_HOST = [
  {
    title: 'Bandwidth cost',
    body: 'Self-hosting replaces a vendor invoice with infrastructure, CDN delivery, storage, operations, and engineering costs that you control. Whether it costs less depends on your source images, cache-hit rate, traffic geography, formats, quality settings, and team time. Measure source and delivered bytes on your own workload before treating self-hosting as a savings claim.',
  },
  {
    title: 'Privacy and GDPR',
    body: 'Every image request to a third-party CDN ships your visitors’ IP addresses, referers, and browsing patterns to another processor — one more DPA to sign, one more sub-processor to disclose. Self-hosting keeps the entire image pipeline inside your own VPC or region. For EU data-residency requirements, that is the difference between a paragraph in your privacy policy and a compliance project.',
  },
  {
    title: 'Control',
    body: 'No vendor rate limits, no plan-gated features, no surprise repricing. You tune the cache size, the concurrency limits, and the origin timeouts. You decide when to upgrade.',
  },
]

const COMPARISON_ROWS = [
  {
    label: 'Web dashboard',
    keenpix: 'Yes — projects, settings, logs',
    imgproxy: 'No',
    thumbor: 'No',
    ipx: 'No',
  },
  {
    label: 'Analytics',
    keenpix: 'Bandwidth saved, cache hit rate, format mix, latency, live logs',
    imgproxy: 'No',
    thumbor: 'No',
    ipx: 'No',
  },
  {
    label: 'Origin security',
    keenpix: 'Per-project host allowlists in the UI, SSRF-hardened',
    imgproxy: 'ALLOWED_SOURCES env config',
    thumbor: 'Config file + mandatory URL signing',
    ipx: 'domains env config',
  },
  {
    label: 'Signed URLs',
    keenpix: 'Optional HMAC',
    imgproxy: 'Yes (key + salt)',
    thumbor: 'Yes (required)',
    ipx: 'No',
  },
  {
    label: 'Response cache',
    keenpix: 'Disk + memory with stale-while-revalidate, built in',
    imgproxy: 'None — bring your own',
    thumbor: 'Result storage (extra setup)',
    ipx: 'None — bring your own',
  },
  {
    label: 'Install',
    keenpix: 'One docker compose up -d (app + Postgres)',
    imgproxy: 'Container plus your own config, cache, and monitoring',
    thumbor: 'Manual Python setup',
    ipx: 'Node library — embed it yourself',
  },
  {
    label: 'License',
    keenpix: 'AGPL-3.0',
    imgproxy: 'Apache-2.0 (core)',
    thumbor: 'MIT',
    ipx: 'MIT',
  },
  {
    label: 'Managed option',
    keenpix: 'Yes — managed cloud and self-host paths',
    imgproxy: 'Pro is a paid self-hosted tier, no managed cloud',
    thumbor: 'No',
    ipx: 'No',
  },
]

const PROMISES = [
  {
    title: 'Zero telemetry',
    body: 'Your self-hosted instance phones home to nobody. Analytics are computed and stored on your own infrastructure, for you.',
  },
  {
    title: 'AGPL-3.0, no license fee',
    body: 'The current v0.2.1 source is AGPL-3.0. Earlier releases through v0.1.11 remain available under Apache-2.0.',
  },
  {
    title: 'No CLA',
    body: 'There is no contributor license agreement. Review the AGPL-3.0 terms and repository history for the exact rights that apply to each release.',
  },
  {
    title: 'Cloud and self-host deployment paths',
    body: 'The repository includes Docker and Coolify deployment paths. Validate performance, backups, monitoring, and capacity against your own workload before production use.',
  },
]

const LIMITATIONS = [
  'No video. Images only — if you need video transcoding, look at Cloudinary or Gumlet.',
  'No storage or DAM. Keenpix transforms and delivers from origins you already have — S3, R2, your app server. There is no upload API, no media library, no asset search.',
  'Young product. Keenpix is newer than the alternatives in the table above and built by a solo founder. The repository is available for teams to audit directly, but maturity and support depth should be evaluated against your own requirements.',
  'Managed custom delivery domains require Pro or Business; self-hosters use whatever domains their reverse proxy supports.',
]

const ALTERNATIVES = [
  {
    name: 'imgproxy',
    reason:
      'you want a headless Apache-2.0-licensed Go binary and you already own your cache, metrics, and dashboards — or you need Pro’s video/PDF thumbnails.',
  },
  {
    name: 'Thumbor',
    reason: 'you are invested in its Python plugin ecosystem.',
  },
  {
    name: 'ipx',
    reason:
      'you are on Nuxt and want in-process optimization with no extra service.',
  },
  {
    name: 'Cloudinary or ImageKit',
    reason:
      'you need DAM, video, and AI features under one roof and the pricing works for your volume.',
  },
  {
    name: 'Bunny Optimizer',
    reason:
      'you want a $9.50/month per-website optimizer fee plus separately billed CDN bandwidth. Bunny Optimizer added GA AVIF output in June 2026 and has no self-host path; compare its region-specific bandwidth price with your own traffic rather than assuming a universal lowest cost.',
  },
]

export function SelfHostedLandingPage({
  repositoryUrl,
}: {
  repositoryUrl: string
}) {
  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Self-host
            </span>
            <h1 className="mt-2 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              The self-hosted image CDN that keeps the dashboard.
            </h1>
            <p className="mt-4 text-balance text-lg text-muted-foreground leading-relaxed">
              Keenpix is an open-source image optimization and delivery layer
              you run yourself: sharp-powered transforms, automatic AVIF/WebP
              negotiation, a disk + memory cache with stale-while-revalidate,
              and built-in analytics — installed with one Docker command. It is
              the v0.2.1 engine used by the managed-cloud code path, licensed
              AGPL-3.0, and designed to sit behind the CDN you already have.
            </p>
            <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">
              No uploads to migrate, no API keys to leak, no per-transformation
              meter. Point it at the origins where your images already live and
              rewrite one URL prefix.
            </p>
            <div className="mt-6">
              <CodeBlock>
                {
                  'GET /img/https://your-origin.com/photo.jpg?project=abc&w=1200&fmt=auto'
                }
              </CodeBlock>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                className={buttonVariants()}
                href={repositoryUrl}
                rel="noreferrer"
                target="_blank"
              >
                Get the code on GitHub
              </a>
              <a
                className={buttonVariants({ variant: 'outline' })}
                href="/docs/self-hosting"
              >
                Read the self-hosting docs
              </a>
              <Link
                className="text-muted-foreground text-sm hover:text-foreground hover:underline"
                to="/signup"
              >
                Or let us run it for you
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Why self-host an image CDN at all?
            </h2>
            <div className="mt-8 flex flex-col gap-6">
              {WHY_SELF_HOST.map((item) => (
                <div className="border-border border-l pl-4" key={item.title}>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-4xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Not just another bare transform server
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              If you have shopped for self-hosted image optimization, you have
              found imgproxy, Thumbor, and ipx. They are all solid transform
              engines — Keenpix actually implements the full ipx modifier
              vocabulary, so <code className="font-mono text-sm">w</code>,{' '}
              <code className="font-mono text-sm">h</code>,{' '}
              <code className="font-mono text-sm">fit</code>,{' '}
              <code className="font-mono text-sm">quality</code>,{' '}
              <code className="font-mono text-sm">blur</code>, and friends
              behave the way you expect. The difference is everything around the
              transform:
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Self-hosted image optimization feature comparison
                </caption>
                <thead>
                  <tr className="border-b">
                    <th
                      className="py-3 pr-4 font-medium text-muted-foreground"
                      scope="col"
                    >
                      <span className="sr-only">Feature</span>
                    </th>
                    <th className="py-3 pr-4 font-semibold" scope="col">
                      Keenpix
                    </th>
                    <th className="py-3 pr-4 font-semibold" scope="col">
                      imgproxy (OSS)
                    </th>
                    <th className="py-3 pr-4 font-semibold" scope="col">
                      Thumbor
                    </th>
                    <th className="py-3 font-semibold" scope="col">
                      ipx
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr className="border-b" key={row.label}>
                      <th
                        className="py-3 pr-4 align-top font-medium"
                        scope="row"
                      >
                        {row.label}
                      </th>
                      <td className="py-3 pr-4 align-top">{row.keenpix}</td>
                      <td className="py-3 pr-4 align-top text-muted-foreground">
                        {row.imgproxy}
                      </td>
                      <td className="py-3 pr-4 align-top text-muted-foreground">
                        {row.thumbor}
                      </td>
                      <td className="py-3 align-top text-muted-foreground">
                        {row.ipx}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              To be fair to imgproxy — and to correct a claim you will see
              repeated elsewhere — basic watermarks and basic smart crop are in
              its open-source version. What Pro adds is the advanced tier:
              object-detection cropping, dynamic watermarks, autoquality,
              automatic best-format selection, and video/PDF thumbnails. If all
              you need is a fast, headless resize proxy and you already run
              Prometheus, a cache tier, and your own dashboards, imgproxy is a
              genuinely great piece of software.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Keenpix is for the team that wants the whole thing — engine,
              cache, security model, and observability — in one deployment, with
              a UI for normal project operations. Production readiness still
              requires secrets, backups, capacity checks, and the deployment
              validation described in the docs.
            </p>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Docker quickstart
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Keenpix ships as a single Node container (sharp needs Node, not an
              edge runtime) plus Postgres:
            </p>
            <div className="mt-6">
              <CodeBlock>{`git clone ${repositoryUrl} && cd keenpix
cp .env.example .env
# set a strong secret:
#   BETTER_AUTH_SECRET=$(openssl rand -hex 32)
# set POSTGRES_PASSWORD, KEENPIX_SUPER_ADMIN_EMAIL, and KEENPIX_SUPER_ADMIN_PASSWORD
docker compose up -d --build
# → http://localhost:3000`}</CodeBlock>
            </div>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              The container runs migrations, seeds your admin user, and serves
              both the dashboard and the transform endpoint. From there: sign
              in, create a project pointed at your image origin, add that origin
              to the allowlist, and request your first transform — no API key
              required in the URL. The repository also includes a Coolify
              deployment path. The{' '}
              <a
                className="text-foreground underline underline-offset-4 hover:text-primary"
                href="/docs/self-hosting"
              >
                deploy guide
              </a>{' '}
              walks through every step.
            </p>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Architecture: it sits behind your CDN
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Keenpix is not trying to replace Cloudflare's cache — it is
              designed to be its origin shield:
            </p>
            <div className="mt-6">
              <CodeBlock>{`Browser ──▶ Your CDN (Cloudflare, etc.) ──▶ Keenpix (Node + sharp) ──▶ your image origins
                cache /img/*                     │
                                                 ├── disk + memory cache (SWR)
                                                 └── Postgres (projects, request logs)`}</CodeBlock>
            </div>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              Transform responses are emitted{' '}
              <code className="font-mono text-sm">
                public, max-age=31536000, immutable
              </code>
              , so one Cloudflare Cache Rule on{' '}
              <code className="font-mono text-sm">/img/*</code> lets the edge
              answer cached repeat requests without reaching Keenpix. Keenpix's
              two-tier cache with stale-while-revalidate can also avoid repeated
              origin fetches. The actual edge, Keenpix, and origin hit rates
              depend on your traffic and cache configuration and should be
              measured in your environment. The{' '}
              <a
                className="text-foreground underline underline-offset-4 hover:text-primary"
                href="/docs/self-hosting/cdn"
              >
                CDN setup guide
              </a>{' '}
              has ready-made rules for Cloudflare, Nginx, and Caddy.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Security is deny-by-default: a project only fetches from origin
              hosts you have explicitly allowlisted, the fetcher is hardened
              against SSRF, and there are no public API keys to rotate or leak.
              If you want tamper-proof URLs on top, HMAC-signed URLs are
              available too.
            </p>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Zero telemetry and published license terms
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {PROMISES.map((promise) => (
                <div
                  className="border-border border-l pl-4"
                  key={promise.title}
                >
                  <h3 className="font-semibold">{promise.title}</h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                    {promise.body}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-muted-foreground text-sm leading-relaxed">
              AGPL-3.0 generally requires operators who modify the program and
              offer it over a network to provide the corresponding source to
              those users. Review the license itself and obtain legal advice for
              your deployment; this page is not legal guidance.
            </p>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Honest limitations
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              You should know what Keenpix is not before you deploy it:
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {LIMITATIONS.map((limitation) => (
                <li
                  className="border-border border-l pl-4 text-muted-foreground leading-relaxed"
                  key={limitation}
                >
                  {limitation}
                </li>
              ))}
            </ul>
            <h3 className="mt-10 font-semibold text-lg">
              When something else is the better choice
            </h3>
            <ul className="mt-4 flex flex-col gap-2 text-muted-foreground leading-relaxed">
              {ALTERNATIVES.map((alternative) => (
                <li key={alternative.name}>
                  <span className="font-medium text-foreground">
                    {alternative.name}
                  </span>{' '}
                  — {alternative.reason}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Frequently asked questions
            </h2>
            <dl className="mt-8 flex flex-col divide-y">
              {SELF_HOSTED_FAQ.map((item) => (
                <div
                  className="flex flex-col gap-2 py-6 first:pt-0 last:pb-0"
                  key={item.question}
                >
                  <dt className="font-medium text-lg">{item.question}</dt>
                  <dd className="text-muted-foreground leading-relaxed">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="bg-muted/30">
          <div className="mx-auto flex max-w-3xl flex-col items-start justify-between gap-6 px-6 py-12 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-2xl tracking-tight">
                Get started
              </h2>
              <p className="mt-2 text-muted-foreground">
                Star it, clone it,{' '}
                <span className="font-mono">docker compose up -d</span> — or
                skip the ops entirely.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <a
                className={buttonVariants({ variant: 'outline' })}
                href="/docs/self-hosting"
              >
                Self-hosting docs
              </a>
              <a
                className={buttonVariants()}
                href={repositoryUrl}
                rel="noreferrer"
                target="_blank"
              >
                GitHub
                <ArrowRightIcon data-icon="inline-end" />
              </a>
            </div>
          </div>
          <div className="mx-auto max-w-3xl px-6 pb-10">
            <p className="text-muted-foreground text-sm">
              Prefer the managed cloud?{' '}
              <Link
                className="inline-flex min-h-11 touch-manipulation items-center underline underline-offset-4 hover:text-foreground"
                to="/signup"
              >
                Start a 14-day trial
              </Link>{' '}
              — managed v0.2.1 deployment, from $9/month.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
