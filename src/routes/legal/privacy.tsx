import { createFileRoute } from '@tanstack/react-router'
import { LegalLayout } from '@/features/legal/legal-layout'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/legal/privacy')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/legal/privacy') }],
    meta: seo({
      title: 'Privacy Policy - Keenpix',
      description:
        'How Keenpix collects, uses, and protects personal data in the cloud service.',
      url: absoluteUrl('/legal/privacy'),
    }),
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <LegalLayout lastUpdated="July 11, 2026" title="Privacy Policy">
      <p>
        This Privacy Policy explains how Keenpix ("we", "us") collects, uses,
        and protects personal data when you use the Keenpix cloud service. Where
        you use Keenpix to process data on behalf of your own users, you are the
        controller and we act as your processor under the{' '}
        <a href="/legal/dpa">Data Processing Addendum</a>.
      </p>

      <h2>Data we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> name, email address, and authentication
          credentials (passwords are stored only as salted hashes).
        </li>
        <li>
          <strong>Workspace and project configuration:</strong> project names,
          allowlisted origin hosts, and pipeline settings you create.
        </li>
        <li>
          <strong>Operational logs and analytics:</strong> per-request metadata
          — timestamp, requested path, image format, response status, cache
          result, latency, bytes delivered, and coarse country — used to power
          your dashboard and to bill bandwidth. We do not store the image bytes
          beyond the transform cache.
        </li>
        <li>
          <strong>Billing data:</strong> handled by our merchant of record,
          Polar. We receive subscription status and customer identifiers; we do
          not store full card details.
        </li>
        <li>
          <strong>Optional website analytics:</strong> after you explicitly
          consent, Google Analytics receives page and funnel events such as CTA
          clicks, signup, project creation, first image delivery, and checkout.
          Google Analytics may also collect the page location and title,
          referrer, browser and device information, approximate location,
          analytics cookies, and interactions enabled through Enhanced
          Measurement. Keenpix does not intentionally send account,
          organization, project, image, API key, or email data. Advertising
          storage and personalization remain disabled.
        </li>
        <li>
          <strong>Optional performance telemetry:</strong> a 10% sample of
          consented page visits reports LCP, INP, and CLS with the route, device
          class, viewport size, and navigation type to Keenpix’s same-origin
          endpoint. It does not include cookies, account data, IP fields, URLs
          with queries, referrers, user agents, or DOM content.
        </li>
      </ul>

      <h2>How we use data</h2>
      <ul>
        <li>to operate, secure, and improve the service;</li>
        <li>
          to render your analytics and logs and to meter bandwidth for billing;
        </li>
        <li>
          to send transactional email (verification, password reset,
          invitations, billing notices) via our email provider, Postmark; and
        </li>
        <li>to comply with legal obligations and enforce our Terms.</li>
      </ul>

      <h2>Sub-processors</h2>
      <p>
        We rely on a small set of infrastructure sub-processors: our hosting and
        database providers, Cloudflare R2 for the shared image cache, ClickHouse
        for analytics storage, Polar for payments, and Postmark for email. Each
        processes data only to provide their function.
      </p>

      <h2>Analytics choices</h2>
      <p>
        Analytics is off until you choose “Allow analytics.” Declining does not
        affect the service. You can change your choice at any time through the
        “Privacy choices” control shown on the site. Keenpix also respects the
        browser’s Do Not Track setting by not loading analytics. Revoking
        consent immediately stops future funnel and Web Vitals reports, updates
        Google Consent Mode to denied, and removes Keenpix-domain Google
        Analytics cookies. The already-loaded tag script remains inert until the
        next navigation; it is not loaded on later denied visits.
      </p>

      <h2>Retention</h2>
      <p>
        Operational logs are retained according to your plan's retention window;
        aggregated analytics are retained for up to one year. Account data is
        kept while your account is active and deleted (or anonymized) within a
        reasonable period after account closure, subject to legal retention
        requirements.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct,
        export, or delete your personal data, and to object to or restrict
        certain processing. To exercise these rights, email{' '}
        <a href="mailto:privacy@keenpix.com">privacy@keenpix.com</a>. You can
        also delete projects and close your account from the app at any time.
      </p>

      <h2>Security</h2>
      <p>
        We encrypt data in transit, isolate workspaces by tenant, hash
        passwords, and follow least-privilege access. No system is perfectly
        secure, but we work to protect your data and to disclose material
        incidents promptly.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Email{' '}
        <a href="mailto:privacy@keenpix.com">privacy@keenpix.com</a>.
      </p>
    </LegalLayout>
  )
}
