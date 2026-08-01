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
        The Keenpix engine is licensed under the{' '}
        <a href={LICENSE_URL} rel="noreferrer" target="_blank">
          GNU Affero General Public License v3.0 (AGPL-3.0)
        </a>
        . You are free to run it on your own infrastructure subject to that
        license, including for commercial use. If you modify the engine and
        offer it to others over a network, the AGPL requires you to share your
        modifications' source. See the{' '}
        <a href="/docs/self-hosting">self-hosting guide</a> to deploy it with
        Docker.
      </p>
      <p>
        Our promise: the self-host engine stays AGPL-licensed and free — no
        rug-pull, no contributor license agreement, no features removed from
        self-host to upsell the cloud. Releases published before the AGPL
        relicense (v0.1.11 and earlier) remain available under Apache-2.0.
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
