export type LegalInline =
  | string
  | { kind: 'link'; text: string; href: string; external?: boolean }
  | { kind: 'strong'; text: string }

export type LegalBlock =
  | { kind: 'paragraph'; content: LegalInline[] }
  | { kind: 'list'; items: LegalInline[][] }

interface LegalPageDefinition {
  description: string
  introduction: LegalBlock[]
  lastUpdated: string
  sections: Array<{
    blocks: LegalBlock[]
    title: string
  }>
  seoTitle: string
  title: string
}

export const LEGAL_PAGE_IDS = ['terms', 'privacy', 'dpa', 'license'] as const
export type LegalPageId = (typeof LEGAL_PAGE_IDS)[number]

export const LEGAL_PAGES = {
  terms: {
    title: 'Terms of Service',
    seoTitle: 'Keenpix Terms of Service | Managed Image CDN',
    description:
      'Read the terms governing Keenpix cloud accounts, image delivery, billing, acceptable use, source origins, subscriptions, and service availability.',
    lastUpdated: 'August 5, 2026',
    introduction: [
      {
        kind: 'paragraph',
        content: [
          'These Terms of Service ("Terms") govern your access to and use of the Keenpix cloud service operated by Keenpix ("Keenpix", "we", "us"). By creating an account or using the service you agree to these Terms. If you are using Keenpix on behalf of an organization, you represent that you are authorized to bind that organization.',
        ],
      },
    ],
    sections: [
      {
        title: '1. The service',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Keenpix is a hosted image-optimization proxy and CDN. You point Keenpix at images you are authorized to use, and we transform and deliver them. Keenpix does not host your source images; it fetches them from origins you configure and control. The open-source engine is separately available for self-hosting under its own license (see the ',
              { kind: 'link', text: 'License', href: '/legal/license' },
              ').',
            ],
          },
        ],
      },
      {
        title: '2. Accounts and workspaces',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'You are responsible for your account credentials and for all activity in your workspace. You must provide accurate information and keep your email address current. You must be at least 16 years old to use Keenpix.',
            ],
          },
        ],
      },
      {
        title: '3. Acceptable use',
        blocks: [
          {
            kind: 'paragraph',
            content: ['You agree not to use Keenpix to:'],
          },
          {
            kind: 'list',
            items: [
              [
                'proxy or deliver content you do not own or have permission to use, or that infringes intellectual-property rights;',
              ],
              [
                'deliver unlawful, infringing, or abusive content, including CSAM, which results in immediate termination and reporting;',
              ],
              [
                'attempt to breach isolation between workspaces, probe the service for vulnerabilities without authorization, or circumvent usage limits; or',
              ],
              [
                'distribute malware, phishing material, spam, or other content intended to deceive or harm others; or',
              ],
              [
                'use the service in a way that overloads, disrupts, or impairs it for other customers.',
              ],
            ],
          },
        ],
      },
      {
        title: '4. Plans, billing, and usage',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              "Paid plans are billed through our merchant of record, Polar, which handles payment processing, invoicing, and applicable taxes. Each plan includes a monthly managed-delivery allotment. Successful optimized responses delivered through the Keenpix-managed edge or application count once; delivery above that allotment is billed at the published per-GB overage rate for your plan. Whether Cloudflare, Keenpix's optimized-variant cache, or a new origin transform supplies that response does not change the billable count. Saved bandwidth is separate analytics and is never added to delivered bytes. Transforms, requests, and team members are not separately metered. Subscriptions renew automatically until cancelled; you can cancel at any time from your billing portal and retain access through the end of the paid period. Fees are non-refundable except where required by law. If you believe a charge is incorrect, contact us with the invoice or receipt before opening a payment dispute so we can investigate it.",
            ],
          },
        ],
      },
      {
        title: '5. Your content and origins',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'You retain all rights to your images. You grant Keenpix a limited license to fetch, transform, cache, and deliver them solely to provide the service. You are responsible for the origins you allowlist and for the legality of the content served through your projects.',
            ],
          },
        ],
      },
      {
        title: '6. Availability and changes',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'We aim for high availability but do not guarantee uninterrupted service. We may modify or discontinue features with reasonable notice. Material changes to these Terms will be posted here with an updated date.',
            ],
          },
        ],
      },
      {
        title: '7. Termination',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'You may stop using Keenpix at any time. We may suspend or terminate access for violation of these Terms, non-payment, a credible security risk, or activity that may harm the service or others. Where practical, we will give notice and an opportunity to fix the issue. Because the engine is open source, you can migrate to a self-hosted deployment and keep your transform URLs.',
            ],
          },
        ],
      },
      {
        title: '8. Disclaimers and liability',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'The service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Keenpix\'s aggregate liability for any claim arising from the service is limited to the amounts you paid in the three months preceding the claim. We are not liable for indirect or consequential damages.',
            ],
          },
        ],
      },
      {
        title: '9. Ownership and feedback',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Keenpix and its licensors retain rights in the service, software, documentation, and branding. These Terms do not transfer ownership of your content or Keenpix intellectual property. If you send product feedback, you allow us to use it without restriction or payment.',
            ],
          },
        ],
      },
      {
        title: '10. Your responsibility',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              "You are responsible for claims arising from content, origins, or instructions you provide, including claims that they infringe another party's rights. Keep independent copies of source assets and do not use the transform cache as your only backup.",
            ],
          },
        ],
      },
      {
        title: '11. Contact',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Questions about these Terms? Email ',
              {
                kind: 'link',
                text: SUPPORT_EMAIL,
                href: `mailto:${SUPPORT_EMAIL}`,
              },
              '.',
            ],
          },
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    seoTitle: 'Keenpix Privacy Policy | Image CDN Service',
    description:
      'Learn how Keenpix collects, uses, protects, and retains account, operational, billing, support, and optional website analytics data in the cloud service.',
    lastUpdated: 'September 5, 2026',
    introduction: [
      {
        kind: 'paragraph',
        content: [
          'This Privacy Policy explains how Keenpix ("we", "us") collects, uses, and protects personal data when you use the Keenpix cloud service. Where you use Keenpix to process data on behalf of your own users, you are the controller and we act as your processor under the ',
          {
            kind: 'link',
            text: 'Data Processing Addendum',
            href: '/legal/dpa',
          },
          '.',
        ],
      },
    ],
    sections: [
      {
        title: 'Data we collect',
        blocks: [
          {
            kind: 'list',
            items: [
              [
                { kind: 'strong', text: 'Account data:' },
                ' name, email address, and authentication credentials (passwords are stored only as salted hashes).',
              ],
              [
                {
                  kind: 'strong',
                  text: 'Workspace and project configuration:',
                },
                ' project names, allowlisted origin hosts, and pipeline settings you create.',
              ],
              [
                { kind: 'strong', text: 'Operational logs and analytics:' },
                ' per-request metadata — timestamp, requested path, image format, response status, cache result, latency, and bytes delivered — used to power your dashboard and to bill managed delivery. Coarse country may be recorded when a trusted edge supplies it; it is otherwise left empty. We do not store the image bytes beyond the transform cache.',
              ],
              [
                { kind: 'strong', text: 'Billing data:' },
                ' handled by our merchant of record, Polar. We receive subscription status and customer identifiers; we do not store full card details.',
              ],
              [
                { kind: 'strong', text: 'Optional website analytics:' },
                ' after you explicitly consent, Google Analytics receives page and funnel events such as CTA clicks, signup, project creation, and checkout. Google Analytics may also collect the page location and title, referrer, browser and device information, approximate location, analytics cookies, and interactions enabled through Enhanced Measurement. Keenpix does not intentionally send account, organization, project, image, API key, or email data. Advertising storage and personalization remain disabled.',
              ],
              [
                { kind: 'strong', text: 'Website performance telemetry:' },
                ' Cloudflare Web Analytics measures page views, load timing, and Core Web Vitals such as LCP, INP, and CLS for visitors in all configured regions, including the EU. Its beacon uses no cookies or browser storage and Cloudflare states that source IP addresses are discarded at its nearest data center.',
              ],
            ],
          },
        ],
      },
      {
        title: 'How we use data',
        blocks: [
          {
            kind: 'list',
            items: [
              ['to operate, secure, and improve the service;'],
              [
                'to render your analytics and logs and to meter managed delivery for billing;',
              ],
              [
                'to send transactional email (verification, password reset, invitations, billing notices) via our email provider, Postmark; and',
              ],
              ['to comply with legal obligations and enforce our Terms.'],
            ],
          },
          {
            kind: 'paragraph',
            content: [
              'We do not sell personal data or use service data for targeted advertising.',
            ],
          },
        ],
      },
      {
        title: 'Sub-processors',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'We rely on a small set of infrastructure sub-processors: our hosting and database providers, Cloudflare for traffic delivery, security, R2 image caching, and Web Analytics, ClickHouse for analytics storage, Polar for payments, and Postmark for email. Each processes data only to provide its function.',
            ],
          },
        ],
      },
      {
        title: 'Analytics choices',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Google Analytics is off until you choose “Allow analytics.” Declining does not affect the service. Your choice is remembered for one year, so the prompt is not shown again on normal revisits. Clear Keenpix site data in your browser and reload the site if you want to choose again. Keenpix also respects the browser’s Do Not Track setting by not loading Google analytics. Declining stops future Google funnel reports, updates Google Consent Mode to denied, and removes Keenpix-domain Google Analytics cookies. Cloudflare’s separate cookie-free Web Analytics beacon remains active for site performance measurement in all regions, including the EU, and is not used for Keenpix account or image-project analytics.',
            ],
          },
        ],
      },
      {
        title: 'Retention',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              "Operational logs are retained according to your plan's retention window; aggregated analytics are retained for up to one year. Account data is kept while your account is active and deleted (or anonymized) within a reasonable period after account closure, subject to legal retention requirements.",
            ],
          },
        ],
      },
      {
        title: 'Your rights',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Depending on your location, you may have rights to access, correct, export, or delete your personal data, and to object to or restrict certain processing. To exercise these rights, email ',
              {
                kind: 'link',
                text: SUPPORT_EMAIL,
                href: `mailto:${SUPPORT_EMAIL}`,
              },
              '. You can also delete projects and close your account from the app at any time.',
            ],
          },
        ],
      },
      {
        title: 'Children',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Keenpix is not directed to children under 16, and we do not knowingly collect their personal data. If you believe a child has provided data, contact us so we can review and delete it where appropriate.',
            ],
          },
        ],
      },
      {
        title: 'Security',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'We encrypt data in transit, isolate workspaces by tenant, hash passwords, and follow least-privilege access. No system is perfectly secure, but we work to protect your data and to disclose material incidents promptly.',
            ],
          },
        ],
      },
      {
        title: 'Contact',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Questions about privacy? Email ',
              {
                kind: 'link',
                text: SUPPORT_EMAIL,
                href: `mailto:${SUPPORT_EMAIL}`,
              },
              '.',
            ],
          },
        ],
      },
    ],
  },
  dpa: {
    title: 'Data Processing Addendum',
    seoTitle: 'Data Processing Addendum - Keenpix',
    description:
      'Review the data-processing terms, controller and processor roles, security measures, subprocessors, transfers, and deletion duties for Keenpix cloud.',
    lastUpdated: 'July 13, 2026',
    introduction: [
      {
        kind: 'paragraph',
        content: [
          'This Data Processing Addendum ("DPA") forms part of the ',
          { kind: 'link', text: 'Terms of Service', href: '/legal/terms' },
          ' between you ("Controller") and Keenpix ("Processor") and applies where Keenpix processes personal data on your behalf in providing the service. Where terms conflict, this DPA controls for data-protection matters.',
        ],
      },
    ],
    sections: [
      {
        title: '1. Roles and scope',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'You are the controller of the personal data you route through Keenpix (including data embedded in or associated with the images and requests of your end users). Keenpix is the processor and processes such data only on your documented instructions, which include your configuration of the service and these terms.',
            ],
          },
        ],
      },
      {
        title: '2. Nature and purpose of processing',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Keenpix fetches, transforms, caches, and delivers images from origins you control, and records per-request operational metadata to power your analytics, logs, and managed-delivery billing. The categories of data subjects and personal data are those you choose to route through the service.',
            ],
          },
        ],
      },
      {
        title: '3. Confidentiality',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Keenpix ensures that personnel authorized to process personal data are bound by confidentiality obligations.',
            ],
          },
        ],
      },
      {
        title: '4. Security',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Keenpix implements appropriate technical and organizational measures, including encryption in transit, tenant isolation, hashed credentials, and least-privilege access, to protect personal data against unauthorized access, loss, or disclosure.',
            ],
          },
        ],
      },
      {
        title: '5. Sub-processors',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'You authorize Keenpix to engage the sub-processors listed in our ',
              {
                kind: 'link',
                text: 'Privacy Policy',
                href: '/legal/privacy',
              },
              ' (hosting/database, Cloudflare R2, ClickHouse, Polar, Postmark). Keenpix imposes data-protection obligations on each sub-processor no less protective than this DPA and remains responsible for their performance. We will give reasonable notice of new sub-processors so you may object on reasonable grounds.',
            ],
          },
        ],
      },
      {
        title: '6. International transfers',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Where personal data is transferred across borders, Keenpix relies on lawful transfer mechanisms (such as Standard Contractual Clauses) with its sub-processors as applicable.',
            ],
          },
        ],
      },
      {
        title: '7. Data subject requests and assistance',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Taking into account the nature of the processing, Keenpix will provide reasonable assistance to help you respond to data-subject requests and to meet your obligations regarding security, breach notification, and impact assessments.',
            ],
          },
        ],
      },
      {
        title: '8. Breach notification',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Keenpix will notify you without undue delay after becoming aware of a personal-data breach affecting your data, with information reasonably available to help you meet your notification obligations.',
            ],
          },
        ],
      },
      {
        title: '9. Deletion and return',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'On termination, Keenpix will delete or return personal data processed on your behalf within a reasonable period, except where retention is required by law. You may also delete projects and data from the app at any time.',
            ],
          },
        ],
      },
      {
        title: '10. Audits',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Keenpix will make available information reasonably necessary to demonstrate compliance with this DPA and allow for audits on reasonable prior notice, subject to confidentiality.',
            ],
          },
        ],
      },
      {
        title: 'Contact',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'To raise a data-protection matter or request a signed copy of this DPA, email ',
              {
                kind: 'link',
                text: SUPPORT_EMAIL,
                href: `mailto:${SUPPORT_EMAIL}`,
              },
              '.',
            ],
          },
        ],
      },
    ],
  },
  license: {
    title: 'License & Open Source',
    seoTitle: 'License & Open Source - Keenpix',
    description:
      'Review the AGPL-3.0 license for the open-source Keenpix image optimization engine, earlier release licensing, self-hosting rights, and operator duties.',
    lastUpdated: 'August 5, 2026',
    introduction: [
      {
        kind: 'paragraph',
        content: [
          'Keenpix is open source. The same engine that powers the managed cloud is published in our public repository and can be self-hosted with no Keenpix license fee. You remain responsible for infrastructure, operations, and any third-party charges. There is no separate "open-core" fork — the cloud is this engine, operated for you.',
        ],
      },
    ],
    sections: [
      {
        title: 'Engine license',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'The Keenpix engine is licensed under the ',
              {
                kind: 'link',
                text: 'GNU Affero General Public License v3.0 (AGPL-3.0)',
                href: `${REPOSITORY_URL}/blob/master/LICENSE`,
                external: true,
              },
              ". You are free to run it on your own infrastructure subject to that license, including for commercial use. If you modify the engine and offer it to others over a network, the AGPL requires you to share your modifications' source. See the ",
              {
                kind: 'link',
                text: 'self-hosting guide',
                href: '/docs/self-hosting',
              },
              ' to deploy it with Docker.',
            ],
          },
          {
            kind: 'paragraph',
            content: [
              'Our promise: the self-host engine stays AGPL-licensed and free — no rug-pull, no contributor license agreement, no features removed from self-host to upsell the cloud. Releases published before the AGPL relicense (v0.1.11 and earlier) remain available under Apache-2.0.',
            ],
          },
        ],
      },
      {
        title: 'Cloud service',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Your use of the hosted Keenpix cloud service is governed by our ',
              { kind: 'link', text: 'Terms of Service', href: '/legal/terms' },
              ' and ',
              {
                kind: 'link',
                text: 'Privacy Policy',
                href: '/legal/privacy',
              },
              ", not by the engine's open-source license. The open-source license covers the software; the cloud terms cover the operated service.",
            ],
          },
        ],
      },
      {
        title: 'Third-party software',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Keenpix builds on excellent open-source projects, including sharp for image processing, TanStack Start and React for the application, Prisma and PostgreSQL for data, ClickHouse for analytics, and better-auth for authentication. Their respective licenses apply to those components.',
            ],
          },
        ],
      },
      {
        title: 'No lock-in',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'Because the engine is open source and cloud and self-host share one URL scheme, you can move between managed cloud and self-hosting without rewriting your image URLs.',
            ],
          },
        ],
      },
      {
        title: 'Editorial content and machine-readable licensing',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              'The source-code license does not by itself define a separate machine-readable license for Keenpix editorial content. Keenpix does not publish an RSL declaration or another editorial-content license without an explicit legal decision and approved text.',
            ],
          },
        ],
      },
    ],
  },
} satisfies Record<LegalPageId, LegalPageDefinition>

function inlineMarkdown(content: LegalInline[]) {
  return content
    .map((part) => {
      if (typeof part === 'string') {
        return part
      }
      if (part.kind === 'strong') {
        return `**${part.text}**`
      }
      return `[${part.text}](${part.href})`
    })
    .join('')
}

function blockMarkdown(block: LegalBlock) {
  if (block.kind === 'paragraph') {
    return inlineMarkdown(block.content)
  }
  return block.items.map((item) => `- ${inlineMarkdown(item)}`).join('\n')
}

export function legalPageMarkdown(pageId: LegalPageId, origin: string) {
  const page = LEGAL_PAGES[pageId]
  return [
    `# ${page.title}`,
    '',
    `Last updated: ${page.lastUpdated}`,
    '',
    ...page.introduction.flatMap((block) => [blockMarkdown(block), '']),
    ...page.sections.flatMap((section) => [
      `## ${section.title}`,
      '',
      ...section.blocks.flatMap((block) => [blockMarkdown(block), '']),
    ]),
    `Canonical HTML: [${origin}/legal/${pageId}](${origin}/legal/${pageId})`,
  ].join('\n')
}

import { SUPPORT_EMAIL } from '@/shared/authors'
import { REPOSITORY_URL } from '@/shared/repository'
