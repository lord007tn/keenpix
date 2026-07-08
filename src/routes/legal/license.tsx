import { createFileRoute } from '@tanstack/react-router'
import { LegalLayout } from '@/features/legal/legal-layout'
import { REPOSITORY_URL } from '@/shared/repository'
import { absoluteUrl, seo } from '@/shared/seo'

const LICENSE_URL = `${REPOSITORY_URL}/blob/master/LICENSE`

export const Route = createFileRoute('/legal/license')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/legal/license') }],
    meta: seo({
      title: 'License & Open Source - Keenpix',
      description:
        'Keenpix is open source. The engine that powers the cloud is available to self-host under its repository license.',
      url: absoluteUrl('/legal/license'),
    }),
  }),
  component: LicensePage,
})

function LicensePage() {
  return (
    <LegalLayout lastUpdated="July 6, 2026" title="License & Open Source">
      <p>
        Keenpix is open source. The same engine that powers the managed cloud is
        published in our public repository and can be self-hosted for free.
        There is no separate "open-core" fork — the cloud is this engine,
        operated for you.
      </p>

      <h2>Engine license</h2>
      <p>
        The Keenpix engine is licensed under the terms in the{' '}
        <a href={LICENSE_URL} rel="noreferrer" target="_blank">
          LICENSE file in the repository
        </a>
        . You are free to run it on your own infrastructure subject to that
        license. See the <a href="/docs/self-hosting">self-hosting guide</a> to
        deploy it with Docker.
      </p>

      <h2>Cloud service</h2>
      <p>
        Your use of the hosted Keenpix cloud service is governed by our{' '}
        <a href="/legal/terms">Terms of Service</a> and{' '}
        <a href="/legal/privacy">Privacy Policy</a>, not by the engine's
        open-source license. The open-source license covers the software; the
        cloud terms cover the operated service.
      </p>

      <h2>Third-party software</h2>
      <p>
        Keenpix builds on excellent open-source projects, including sharp for
        image processing, TanStack Start and React for the application, Prisma
        and PostgreSQL for data, ClickHouse for analytics, and better-auth for
        authentication. Their respective licenses apply to those components.
      </p>

      <h2>No lock-in</h2>
      <p>
        Because the engine is open source and cloud and self-host share one URL
        scheme, you can move between managed cloud and self-hosting without
        rewriting your image URLs.
      </p>
    </LegalLayout>
  )
}
