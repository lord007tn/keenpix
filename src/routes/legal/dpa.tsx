import { createFileRoute } from '@tanstack/react-router'
import { LegalLayout } from '@/features/legal/legal-layout'
import { SUPPORT_EMAIL } from '@/shared/authors'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/legal/dpa')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/legal/dpa') }],
    meta: seo({
      title: 'Data Processing Addendum - Keenpix',
      description:
        'The data processing terms under which Keenpix processes personal data on your behalf.',
      url: absoluteUrl('/legal/dpa'),
    }),
  }),
  component: DpaPage,
})

function DpaPage() {
  return (
    <LegalLayout lastUpdated="July 13, 2026" title="Data Processing Addendum">
      <p>
        This Data Processing Addendum ("DPA") forms part of the{' '}
        <a href="/legal/terms">Terms of Service</a> between you ("Controller")
        and Keenpix ("Processor") and applies where Keenpix processes personal
        data on your behalf in providing the service. Where terms conflict, this
        DPA controls for data-protection matters.
      </p>

      <h2>1. Roles and scope</h2>
      <p>
        You are the controller of the personal data you route through Keenpix
        (including data embedded in or associated with the images and requests
        of your end users). Keenpix is the processor and processes such data
        only on your documented instructions, which include your configuration
        of the service and these terms.
      </p>

      <h2>2. Nature and purpose of processing</h2>
      <p>
        Keenpix fetches, transforms, caches, and delivers images from origins
        you control, and records per-request operational metadata to power your
        analytics, logs, and managed-delivery billing. The categories of data
        subjects and personal data are those you choose to route through the
        service.
      </p>

      <h2>3. Confidentiality</h2>
      <p>
        Keenpix ensures that personnel authorized to process personal data are
        bound by confidentiality obligations.
      </p>

      <h2>4. Security</h2>
      <p>
        Keenpix implements appropriate technical and organizational measures,
        including encryption in transit, tenant isolation, hashed credentials,
        and least-privilege access, to protect personal data against
        unauthorized access, loss, or disclosure.
      </p>

      <h2>5. Sub-processors</h2>
      <p>
        You authorize Keenpix to engage the sub-processors listed in our{' '}
        <a href="/legal/privacy">Privacy Policy</a> (hosting/database,
        Cloudflare R2, ClickHouse, Polar, Postmark). Keenpix imposes
        data-protection obligations on each sub-processor no less protective
        than this DPA and remains responsible for their performance. We will
        give reasonable notice of new sub-processors so you may object on
        reasonable grounds.
      </p>

      <h2>6. International transfers</h2>
      <p>
        Where personal data is transferred across borders, Keenpix relies on
        lawful transfer mechanisms (such as Standard Contractual Clauses) with
        its sub-processors as applicable.
      </p>

      <h2>7. Data subject requests and assistance</h2>
      <p>
        Taking into account the nature of the processing, Keenpix will provide
        reasonable assistance to help you respond to data-subject requests and
        to meet your obligations regarding security, breach notification, and
        impact assessments.
      </p>

      <h2>8. Breach notification</h2>
      <p>
        Keenpix will notify you without undue delay after becoming aware of a
        personal-data breach affecting your data, with information reasonably
        available to help you meet your notification obligations.
      </p>

      <h2>9. Deletion and return</h2>
      <p>
        On termination, Keenpix will delete or return personal data processed on
        your behalf within a reasonable period, except where retention is
        required by law. You may also delete projects and data from the app at
        any time.
      </p>

      <h2>10. Audits</h2>
      <p>
        Keenpix will make available information reasonably necessary to
        demonstrate compliance with this DPA and allow for audits on reasonable
        prior notice, subject to confidentiality.
      </p>

      <h2>Contact</h2>
      <p>
        To raise a data-protection matter or request a signed copy of this DPA,
        email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalLayout>
  )
}
