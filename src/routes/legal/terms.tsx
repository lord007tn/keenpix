import { createFileRoute } from '@tanstack/react-router'
import { LegalLayout } from '@/features/legal/legal-layout'
import { SUPPORT_EMAIL } from '@/shared/authors'
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
    <LegalLayout lastUpdated="August 5, 2026" title="Terms of Service">
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
          distribute malware, phishing material, spam, or other content intended
          to deceive or harm others; or
        </li>
        <li>
          use the service in a way that overloads, disrupts, or impairs it for
          other customers.
        </li>
      </ul>

      <h2>4. Plans, billing, and usage</h2>
      <p>
        Paid plans are billed through our merchant of record, Polar, which
        handles payment processing, invoicing, and applicable taxes. Each plan
        includes a monthly managed-delivery allotment. Successful optimized
        responses delivered through the Keenpix-managed edge or application
        count once; delivery above that allotment is billed at the published
        per-GB overage rate for your plan. Whether Cloudflare, Keenpix&apos;s
        optimized-variant cache, or a new origin transform supplies that
        response does not change the billable count. Saved bandwidth is separate
        analytics and is never added to delivered bytes. Transforms, requests,
        and team members are not separately metered. Subscriptions renew
        automatically until cancelled; you can cancel at any time from your
        billing portal and retain access through the end of the paid period.
        Fees are non-refundable except where required by law. If you believe a
        charge is incorrect, contact us with the invoice or receipt before
        opening a payment dispute so we can investigate it.
      </p>
      <p>
        The first 25 organizations whose Polar subscription first becomes
        actively paid qualify for founding pricing. Trials and complimentary
        access granted by an administrator do not claim a place. A claimed place
        remains claimed after cancellation or churn and does not reopen.
        Founding monthly prices are $9, $19, and $39 for Basic, Pro, and
        Business, with delivered-GB overage of $0.08, $0.06, and $0.05. After
        the cohort fills, standard monthly prices are $9, $29, and $69, with
        overage of $0.12, $0.09, and $0.07. Founding pricing is promised for at
        least 12 months; the current billing implementation does not
        automatically move a founding subscription to a standard product at
        month 12. We will notify affected customers before any future price
        change.
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
        access for violation of these Terms, non-payment, a credible security
        risk, or activity that may harm the service or others. Where practical,
        we will give notice and an opportunity to fix the issue. Because the
        engine is open source, you can migrate to a self-hosted deployment and
        keep your transform URLs.
      </p>

      <h2>8. Disclaimers and liability</h2>
      <p>
        The service is provided "as is" without warranties of any kind. To the
        maximum extent permitted by law, Keenpix's aggregate liability for any
        claim arising from the service is limited to the amounts you paid in the
        three months preceding the claim. We are not liable for indirect or
        consequential damages.
      </p>

      <h2>9. Ownership and feedback</h2>
      <p>
        Keenpix and its licensors retain rights in the service, software,
        documentation, and branding. These Terms do not transfer ownership of
        your content or Keenpix intellectual property. If you send product
        feedback, you allow us to use it without restriction or payment.
      </p>

      <h2>10. Your responsibility</h2>
      <p>
        You are responsible for claims arising from content, origins, or
        instructions you provide, including claims that they infringe another
        party's rights. Keep independent copies of source assets and do not use
        the transform cache as your only backup.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these Terms? Email{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalLayout>
  )
}
