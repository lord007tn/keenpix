import { buttonVariants } from '@/components/ui/button'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'

const integrations = [
  {
    title: 'Next.js',
    href: '/docs/frameworks/nextjs',
    kind: 'Custom image loader',
    detail:
      'Keep next/image and its responsive candidate generation. Route image bytes through Keenpix with a custom loader. Keep the built-in optimizer if its deployment and billing already meet your needs.',
  },
  {
    title: 'React and TanStack Start',
    href: '/docs/frameworks/react-family',
    kind: 'Components and image props',
    detail:
      'Use the React component or props factories for React-family applications. Set sizes to the actual layout and reserve dimensions. Generate signed URLs on the server; browser components must never receive signing secrets.',
  },
  {
    title: 'Vue and Nuxt',
    href: '/docs/frameworks/vue-family',
    kind: 'Components and providers',
    detail:
      'Choose the Vue component or Nuxt image provider for the application you already run. Check the rendered srcset and source hostname after hydration before replacing your existing delivery path.',
  },
  {
    title: 'Astro, HTML and other frameworks',
    href: '/docs/frameworks/web-and-meta-frameworks',
    kind: 'URL and markup generation',
    detail:
      'Build image URLs or attributes without adding a separate media library. For a static site, precompute the markup at build time. Keenpix still needs a reachable, allowed original when a variant is first requested.',
  },
  {
    title: 'Existing HTTP image origins',
    href: '/blog/bring-your-own-origin-image-cdn-architecture',
    kind: 'Origin compatibility',
    detail:
      'Keep published images on your existing image server or an HTTP endpoint backed by S3 or R2. This is an allowed-origin fetch workflow, not a bucket synchronization connector. Private buckets need an explicit access design.',
  },
  {
    title: 'Server automation',
    href: '/docs/reference/sdk-package',
    kind: 'Authenticated Node SDK',
    detail:
      'Use the management SDK from trusted code for project configuration and operations. Scope keys to the intended project. This is separate from public image URLs and does not provide an OAuth app marketplace.',
  },
]

export function IntegrationsPage() {
  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <p className="font-medium text-primary text-sm">
              Integrations · reviewed September 11, 2026
            </p>
            <h1 className="mt-4 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              Connect your framework and keep your image origins
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-muted-foreground leading-relaxed">
              Keenpix transforms and delivers images from origins you allowlist.
              Choose a framework adapter for markup, an HTTP origin for
              originals, or the server SDK for management. These solve different
              parts of the workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className={buttonVariants()} href="/signup">
                Create a project
              </a>
              <a
                className={buttonVariants({ variant: 'outline' })}
                href="/docs/getting-started/cloud-quickstart"
              >
                Follow the cloud quickstart
              </a>
            </div>
            <p className="mt-4 text-muted-foreground text-sm">
              Managed evaluation uses a 14-day trial with a card required.
              Review current terms on{' '}
              <a className="underline" href="/pricing">
                pricing
              </a>
              .
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="font-semibold text-2xl">
            Choose the integration boundary
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {integrations.map((item) => (
              <article
                className="rounded-xl border bg-card p-6"
                key={item.title}
              >
                <p className="text-muted-foreground text-sm">{item.kind}</p>
                <h3 className="mt-2 font-semibold text-xl">{item.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {item.detail}
                </p>
                <a
                  className="mt-4 inline-flex min-h-11 items-center font-medium text-primary underline"
                  href={item.href}
                >
                  Read {item.title} guide
                </a>
              </article>
            ))}
          </div>
          <h2 className="mt-12 font-semibold text-2xl">
            Can I use it without installing a package?
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Yes, for managed image delivery: plain HTML can reference a Keenpix
            URL after you create a project and allowlist the original image
            host. A package is optional; project setup and edits to your image
            markup are still required. Self-hosting requires deploying and
            operating services. There is no promise of a one-click CMS plugin or
            automatic migration.
          </p>
          <h2 className="mt-10 font-semibold text-2xl">
            Validate one image before migrating a library
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-6 text-muted-foreground">
            <li>
              Create a project and allow only the source hosts you intend to
              serve.
            </li>
            <li>
              Use the quickstart URL for a published original; confirm a
              successful image response and the intended width and content type.
            </li>
            <li>
              Connect one component. Check its selected image at mobile and
              desktop widths, layout stability, and fallback behavior.
            </li>
            <li>
              Test an unapproved origin and any signed-URL rules. Keep
              credentials out of browser bundles and HTML.
            </li>
            <li>
              Canary a small route and retain the original URL path for rollback
              before migrating the rest.
            </li>
          </ol>
          <h2 className="mt-10 font-semibold text-2xl">
            Where Keenpix is a poor fit
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Choose a media platform with uploads, storage, moderation, video, or
            asset approvals if those are your missing capabilities. Keenpix
            handles the image delivery layer. It also cannot repair an
            unreachable origin or make a private asset safe to publish.
          </p>
          <nav
            aria-label="Related integration resources"
            className="mt-8 flex flex-wrap gap-5 text-primary underline"
          >
            <a href="/docs/frameworks/catalog">Full adapter catalog</a>
            <a href="/blog/private-image-origins-security-boundaries">
              Private-origin boundaries
            </a>
            <a href="/blog/ecommerce-product-image-delivery">
              Product catalog workflow
            </a>
            <a href="/compare">Compare alternatives</a>
            <a href="/self-hosted-image-cdn">Open-source deployment</a>
          </nav>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
