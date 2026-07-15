import { createFileRoute } from '@tanstack/react-router'
import { LegalLayout } from '@/features/legal/legal-layout'
import { SUPPORT_EMAIL } from '@/shared/authors'
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
    <LegalLayout lastUpdated="July 15, 2026" title="Privacy Policy">
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
          result, latency, and bytes delivered — used to power your dashboard
          and to bill bandwidth. Coarse country may be recorded when a trusted
          edge supplies it; it is otherwise left empty. We do not store the
          image bytes beyond the transform cache.
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
          <strong>Website performance telemetry:</strong> Cloudflare Web
          Analytics measures page views, load timing, and Core Web Vitals such
          as LCP, INP, and CLS for visitors in all configured regions, including
          the EU. Its beacon uses no cookies or browser storage and Cloudflare
          states that source IP addresses are discarded at its nearest data
          center.
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
      <p>
        We do not sell personal data or use service data for targeted
        advertising.
      </p>

      <h2>Sub-processors</h2>
      <p>
        We rely on a small set of infrastructure sub-processors: our hosting and
        database providers, Cloudflare for traffic delivery, security, R2 image
        caching, and Web Analytics, ClickHouse for analytics storage, Polar for
        payments, and Postmark for email. Each processes data only to provide
        its function.
      </p>

      <h2>Analytics choices</h2>
      <p>
        Google Analytics is off until you choose “Allow analytics.” Declining
        does not affect the service. Your choice is remembered for one year, so
        the prompt is not shown again on normal revisits. Clear Keenpix site
        data in your browser and reload the site if you want to choose again.
        Keenpix also respects the browser’s Do Not Track setting by not loading
        Google analytics. Declining stops future Google funnel reports, updates
        Google Consent Mode to denied, and removes Keenpix-domain Google
        Analytics cookies. Cloudflare’s separate cookie-free Web Analytics
        beacon remains active for site performance measurement in all regions,
        including the EU, and is not used for Keenpix account or image-project
        analytics.
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
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. You can also
        delete projects and close your account from the app at any time.
      </p>

      <h2>Children</h2>
      <p>
        Keenpix is not directed to children under 16, and we do not knowingly
        collect their personal data. If you believe a child has provided data,
        contact us so we can review and delete it where appropriate.
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
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalLayout>
  )
}
