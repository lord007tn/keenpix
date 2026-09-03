import { ArrowRightIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'
import { SUPPORT_EMAIL } from '@/shared/authors'
import { RELEASES_URL, REPOSITORY_URL } from '@/shared/repository'

export const TRUST_PAGES = {
  security: {
    eyebrow: 'Trust center',
    title: 'Security at Keenpix',
    introduction:
      'Keenpix is an image transformation service, so its first security boundary is deciding which origins and URLs it may fetch. This page documents the controls present in the product; it is not a certification or penetration-test claim.',
    sections: [
      {
        title: 'Origin and request controls',
        body: 'Projects allowlist origin hostnames. Outbound fetches are SSRF-hardened, and optional HMAC-signed URLs can restrict who may create transform requests. No public project API secret needs to be embedded in image markup.',
      },
      {
        title: 'Data handled by the cloud service',
        body: 'The managed service processes source image URLs, transformed image bytes, cache entries, and request telemetry needed for delivery and analytics. Keenpix is not a digital asset manager and does not ask you to move master assets into a Keenpix media library.',
      },
      {
        title: 'Deployment choice',
        body: 'Teams that require infrastructure control can run the AGPL-3.0 engine themselves. Self-hosting transfers responsibility for network policy, updates, backups, monitoring, and incident response to the operator.',
      },
      {
        title: 'Claims we do not make',
        body: 'Keenpix does not currently claim SOC 2, ISO 27001, PCI certification, a public bug-bounty program, or a contractual uptime SLA. Those claims will appear only if supporting evidence exists.',
      },
      {
        title: 'Report a vulnerability',
        body: `Email ${SUPPORT_EMAIL} with a clear description, affected URL or component, and reproduction steps. Do not include live credentials or customer data, and do not access data that is not yours. We ask for reasonable time to investigate before public disclosure.`,
      },
    ],
  },
  status: {
    eyebrow: 'Operations',
    title: 'Service status',
    introduction:
      'Keenpix does not yet publish a historical uptime percentage or a third-party status dashboard. The live health endpoint reports current application health; it is a point-in-time signal, not an SLA or availability history.',
    sections: [
      {
        title: 'Current health',
        body: 'Use the public /api/health endpoint for the cloud application’s current health response. A successful check does not prove that every region, origin, customer project, or upstream service is healthy.',
      },
      {
        title: 'Suspected incident',
        body: `If delivery or the dashboard is failing, contact ${SUPPORT_EMAIL} with the affected project, request URL with secrets removed, response status, approximate time, and region. Do not send API tokens, signing secrets, or payment details.`,
      },
      {
        title: 'Incident communication',
        body: 'Material cloud incidents will be documented through the public changelog or release notes when confirmed. A dedicated incident-history service remains planned; no historical uptime figure is inferred before it exists.',
      },
    ],
  },
  support: {
    eyebrow: 'Help',
    title: 'Keenpix support',
    introduction:
      'Support is available by email for managed-cloud account, billing, delivery, and security questions. Public documentation and GitHub are the best starting points for product behavior and self-hosting issues.',
    sections: [
      {
        title: 'Managed cloud',
        body: `Email ${SUPPORT_EMAIL} with your account email, project identifier, relevant timestamps, and a redacted example URL. No response-time SLA is currently promised, so do not design an incident plan around an unstated guarantee.`,
      },
      {
        title: 'Open-source and self-hosting',
        body: 'Use the public repository for reproducible software defects and feature requests. Keep credentials, private origins, customer data, and production logs out of public issues.',
      },
      {
        title: 'Editorial corrections',
        body: 'For comparison or article corrections, include the page URL, disputed sentence, a primary source, and the date you checked it. Substantive corrections receive a new visible updated date.',
      },
    ],
  },
} as const

export function TrustPage({ page }: { page: keyof typeof TRUST_PAGES }) {
  const content = TRUST_PAGES[page]
  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              {content.eyebrow}
            </span>
            <h1 className="mt-2 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              {content.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              {content.introduction}
            </p>
          </div>
        </section>
        <section>
          <div className="mx-auto max-w-3xl px-6 py-14">
            <div className="flex flex-col gap-8">
              {content.sections.map((section) => (
                <div
                  className="border-border border-l pl-5"
                  key={section.title}
                >
                  <h2 className="font-semibold text-xl">{section.title}</h2>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-wrap gap-3">
              {page === 'status' ? (
                <a
                  className={buttonVariants({
                    className: 'min-h-12 touch-manipulation px-4',
                  })}
                  href="/api/health"
                >
                  Check current health
                </a>
              ) : (
                <a
                  className={buttonVariants({
                    className: 'min-h-12 touch-manipulation px-4',
                  })}
                  href={`mailto:${SUPPORT_EMAIL}`}
                >
                  Contact support
                </a>
              )}
              <a
                className={buttonVariants({
                  className: 'min-h-12 touch-manipulation px-4',
                  variant: 'outline',
                })}
                href="/docs"
              >
                Read documentation
              </a>
              <a
                className={buttonVariants({
                  className: 'min-h-12 touch-manipulation px-4',
                  variant: 'outline',
                })}
                href={page === 'support' ? REPOSITORY_URL : RELEASES_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                {page === 'support' ? 'Open GitHub' : 'View releases'}
                <ArrowRightIcon data-icon="inline-end" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
