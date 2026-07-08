import { createFileRoute } from '@tanstack/react-router'
import { LegalLayout } from '@/features/legal/legal-layout'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/legal/terms')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/legal/terms') }],
    meta: seo({
      title: 'Terms of Service - Keenpix',
      description: 'The terms governing your use of the Keenpix cloud service.',
      url: absoluteUrl('/legal/terms'),
    }),
  }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <LegalLayout lastUpdated="July 6, 2026" title="Terms of Service">
      <p>
        These Terms of Service ("Terms") govern your access to and use of the
        Keenpix cloud service operated by Keenpix ("Keenpix", "we", "us"). By
        creating an account or using the service you agree to these Terms. If
        you are using Keenpix on behalf of an organization, you represent that
        you are authorized to bind that organization.
      </p>

      <h2>1. The service</h2>
      <p>
        Keenpix is a hosted image-optimization proxy and CDN. You point Keenpix
        at images you are authorized to use, and we transform and deliver them.
        Keenpix does not host your source images; it fetches them from origins
        you configure and control. The open-source engine is separately
        available for self-hosting under its own license (see the{' '}
        <a href="/legal/license">License</a>).
      </p>

      <h2>2. Accounts and workspaces</h2>
      <p>
        You are responsible for your account credentials and for all activity in
        your workspace. You must provide accurate information and keep your
        email address current. You must be at least 16 years old to use Keenpix.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You agree not to use Keenpix to:</p>
      <ul>
        <li>
          proxy or deliver content you do not own or have permission to use, or
          that infringes intellectual-property rights;
        </li>
        <li>
          deliver unlawful, infringing, or abusive content, including CSAM,
          which results in immediate termination and reporting;
        </li>
        <li>
          attempt to breach isolation between workspaces, probe the service for
          vulnerabilities without authorization, or circumvent usage limits; or
        </li>
        <li>
          use the service in a way that overloads or impairs it for other
          customers.
        </li>
      </ul>

      <h2>4. Plans, billing, and usage</h2>
      <p>
        Paid plans are billed through our merchant of record, Polar, which
        handles payment processing, invoicing, and applicable taxes. Each plan
        includes a monthly bandwidth allotment; delivery above that allotment is
        billed at the published per-GB overage rate for your plan. Transforms
        are unlimited. Subscriptions renew automatically until cancelled; you
        can cancel at any time from your billing portal and retain access
        through the end of the paid period. Fees are non-refundable except where
        required by law.
      </p>

      <h2>5. Your content and origins</h2>
      <p>
        You retain all rights to your images. You grant Keenpix a limited
        license to fetch, transform, cache, and deliver them solely to provide
        the service. You are responsible for the origins you allowlist and for
        the legality of the content served through your projects.
      </p>

      <h2>6. Availability and changes</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted service.
        We may modify or discontinue features with reasonable notice. Material
        changes to these Terms will be posted here with an updated date.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may stop using Keenpix at any time. We may suspend or terminate
        access for violation of these Terms or non-payment. Because the engine
        is open source, you can migrate to a self-hosted deployment and keep
        your transform URLs.
      </p>

      <h2>8. Disclaimers and liability</h2>
      <p>
        The service is provided "as is" without warranties of any kind. To the
        maximum extent permitted by law, Keenpix's aggregate liability for any
        claim arising from the service is limited to the amounts you paid in the
        three months preceding the claim. We are not liable for indirect or
        consequential damages.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these Terms? Email{' '}
        <a href="mailto:legal@keenpix.com">legal@keenpix.com</a>.
      </p>
    </LegalLayout>
  )
}
