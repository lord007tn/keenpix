import { ArrowRightIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'
import {
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_LABEL,
  SUPPORT_WHATSAPP_URL,
} from '@/shared/authors'
import { REPOSITORY_URL } from '@/shared/repository'

const RESOURCE_GROUPS = [
  {
    title: 'Discover the API',
    description:
      'Start with the machine-readable contract, then use the human documentation for workflows and security context.',
    links: [
      { href: '/openapi.json', label: 'OpenAPI 3.1 specification' },
      { href: '/docs/reference/sdk-api', label: 'SDK API documentation' },
      { href: '/api/health', label: 'Public JSON health endpoint' },
    ],
  },
  {
    title: 'Use the official SDK',
    description:
      'The supported automation client is the server-side @keenpix/sdk package. Keenpix does not publish an official CLI; use the SDK or REST API.',
    links: [
      {
        href: 'https://www.npmjs.com/package/@keenpix/sdk',
        label: '@keenpix/sdk on npm',
      },
      { href: '/docs/reference/sdk-package', label: 'Node SDK guide' },
      {
        href: REPOSITORY_URL,
        label: 'Keenpix source on GitHub',
      },
    ],
  },
  {
    title: 'Read agent-friendly sources',
    description:
      'Use the concise index for discovery or the full Markdown export when an agent needs broader product and documentation context.',
    links: [
      { href: '/llms.txt', label: 'LLM index' },
      { href: '/llms-full.txt', label: 'Full Markdown documentation' },
      { href: '/sitemap.xml', label: 'XML sitemap' },
    ],
  },
]

export function DeveloperResourcesPage() {
  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Developers
            </span>
            <h1 className="mt-2 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              Keenpix developer resources
            </h1>
            <p className="mt-4 max-w-3xl text-balance text-lg text-muted-foreground leading-relaxed">
              Automate image-delivery configuration with a typed OpenAPI
              contract, project-scoped API keys, and the official Node SDK.
              Normal transform URLs remain keyless after the project owner
              configures the source allowlist.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className={buttonVariants()} href="/openapi.json">
                View OpenAPI
                <ArrowRightIcon data-icon="inline-end" />
              </a>
              <a
                className={buttonVariants({ variant: 'outline' })}
                href="/docs/reference/sdk-api"
              >
                Read API docs
              </a>
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto grid max-w-4xl gap-5 px-6 py-14 md:grid-cols-3">
            {RESOURCE_GROUPS.map((group) => (
              <article
                className="rounded-xl border bg-card p-5"
                key={group.title}
              >
                <h2 className="font-semibold text-lg">{group.title}</h2>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  {group.description}
                </p>
                <ul className="mt-5 space-y-3 text-sm">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <a
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        href={link.href}
                      >
                        {link.label}
                        <ArrowRightIcon className="size-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Authentication and onboarding
            </h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border p-5">
                <h3 className="font-semibold">Control-plane API</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  Create a project-scoped key from dashboard settings and send
                  it as <code>Authorization: Bearer &lt;key&gt;</code> or{' '}
                  <code>X-Keenpix-Api-Key</code>. Keenpix does not operate an
                  OAuth authorization server; API keys are the intentional
                  authentication model for these server-to-server operations.
                </p>
              </div>
              <div className="rounded-xl border p-5">
                <h3 className="font-semibold">Try Keenpix</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  Managed plans have a self-serve 14-day trial with a card
                  required and no trial-usage billing. Keenpix does not use a
                  separate API sandbox. For isolated evaluation, run the AGPL
                  engine on your own infrastructure.
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <a
                    className="font-medium text-primary hover:underline"
                    href="/signup"
                  >
                    Start trial
                  </a>
                  <a
                    className="font-medium text-primary hover:underline"
                    href="/docs/self-hosting"
                  >
                    Self-hosting guide
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-xl border p-5" id="contact">
              <h3 className="font-semibold">API and integration contact</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                Contact Raed Bahri for API documentation, integration, or
                agent-readiness questions.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <a
                  className="font-medium text-primary hover:underline"
                  href={`mailto:${SUPPORT_EMAIL}`}
                >
                  {SUPPORT_EMAIL}
                </a>
                <a
                  className="font-medium text-primary hover:underline"
                  href={SUPPORT_WHATSAPP_URL}
                >
                  WhatsApp {SUPPORT_WHATSAPP_LABEL}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
