import { getAppUrl, getRepositoryUrl } from '@/server/deployment'

export const SITE_NAME = 'Keenpix'
export const SITE_TITLE =
  'Keenpix — image optimization CDN with honest pricing, or self-host free'
export const SITE_DESCRIPTION =
  'Keenpix optimizes and delivers your images in modern formats (AVIF, WebP) from one URL — transparent bandwidth pricing, unlimited transforms, no lock-in. Or self-host the open-source engine free.'
export const SITE_KEYWORDS =
  'image optimization CDN, image CDN, Cloudinary alternative, imgix alternative, ImageKit alternative, WebP, AVIF, sharp image transforms, self-hosted image optimization, open-source image CDN, bandwidth pricing'
export const BRAND_IMAGE_PATH = '/brand/keenpix-og.png'
const BRAND_ICON_PATH = '/logo512.png'
export const APP_VERSION = import.meta.env.VITE_APP_VERSION

function pageTitle(title: string) {
  return `${title} - ${SITE_NAME}`
}

// Builds the shared title/description/Open Graph/Twitter meta set so every page
// emits a complete, consistent card. Pass page-specific values to override the
// site defaults; the deepest route's tags win via head deduplication.
export function seo({
  title,
  description = SITE_DESCRIPTION,
  keywords,
  image,
  url,
  type = 'website',
}: {
  title: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: 'website' | 'article'
}) {
  const imageUrl = image ?? absoluteUrl(BRAND_IMAGE_PATH)
  return [
    { title },
    { name: 'description', content: description },
    ...(keywords ? [{ name: 'keywords', content: keywords }] : []),
    { property: 'og:type', content: type },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    ...(url ? [{ property: 'og:url', content: url }] : []),
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: `${SITE_NAME} modular image mark` },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
  ]
}

export function appPageHead(title: string, description: string) {
  return {
    meta: [
      { title: pageTitle(title) },
      { name: 'description', content: description },
    ],
  }
}

export function noIndexPageHead(title: string, description: string) {
  return {
    meta: [
      { title: pageTitle(title) },
      { name: 'description', content: description },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }
}

export function absoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getAppUrl()}${normalizedPath}`
}

// Stable @id anchors so the Organization, WebSite, and SoftwareApplication
// nodes form one linked entity graph instead of three disconnected nodes.
const ORGANIZATION_ID = `${absoluteUrl('/')}#organization`
const WEBSITE_ID = `${absoluteUrl('/')}#website`
const SOFTWARE_ID = `${absoluteUrl('/')}#software`

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': SOFTWARE_ID,
    applicationCategory: 'DeveloperApplication',
    codeRepository: getRepositoryUrl(),
    description: SITE_DESCRIPTION,
    image: absoluteUrl(BRAND_IMAGE_PATH),
    license: `${getRepositoryUrl()}/blob/master/LICENSE`,
    name: SITE_NAME,
    // Free to self-host; managed cloud plans run $9–$29/mo. AggregateOffer lets
    // search engines surface the price range as a rich result.
    offers: {
      '@type': 'AggregateOffer',
      highPrice: '29',
      lowPrice: '0',
      offerCount: '4',
      priceCurrency: 'USD',
    },
    operatingSystem: 'Linux, macOS, Windows',
    publisher: { '@id': ORGANIZATION_ID },
    url: absoluteUrl('/'),
    // Omitted entirely when the version isn't injected at build time.
    ...(APP_VERSION ? { softwareVersion: APP_VERSION } : {}),
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    logo: absoluteUrl(BRAND_ICON_PATH),
    name: SITE_NAME,
    sameAs: [getRepositoryUrl()],
    url: absoluteUrl('/'),
  }
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    description: SITE_DESCRIPTION,
    image: absoluteUrl(BRAND_IMAGE_PATH),
    name: SITE_NAME,
    publisher: { '@id': ORGANIZATION_ID },
    url: absoluteUrl('/'),
  }
}

// FAQPage for the marketing home. The Q&As MUST also be visible on the page —
// Google requires it for FAQ rich results — so this is emitted alongside a visible
// FAQ section, not on its own.
export function faqPageJsonLd(
  items: Array<{ answer: string; question: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

// BlogPosting + breadcrumb graph for a single article. Dated and attributed
// (unlike docs' TechArticle) so search engines can surface it as blog content.
export function blogPostingJsonLd({
  author,
  datePublished,
  description,
  path,
  title,
  url,
}: {
  author: string
  datePublished: string
  description: string
  path: Array<{ name: string; url: string }>
  title: string
  url: string
}) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      author: {
        '@type': 'Organization',
        name: author,
      },
      datePublished,
      description,
      headline: title,
      image: absoluteUrl(BRAND_IMAGE_PATH),
      mainEntityOfPage: url,
      publisher: {
        '@type': 'Organization',
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl(BRAND_ICON_PATH),
        },
        name: SITE_NAME,
      },
      url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: path.map((item, index) => ({
        '@type': 'ListItem',
        item: item.url,
        name: item.name,
        position: index + 1,
      })),
    },
  ]
}

export function docsJsonLd({
  description,
  path,
  title,
  url,
}: {
  description?: string
  path: Array<{ name: string; url: string }>
  title: string
  url: string
}) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      about: SITE_NAME,
      author: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
      description,
      headline: title,
      image: absoluteUrl(BRAND_IMAGE_PATH),
      isPartOf: {
        '@type': 'WebSite',
        name: 'Keenpix documentation',
        url: absoluteUrl('/docs'),
      },
      keywords:
        'self-hosted image optimization, image CDN, sharp, Postgres, TanStack Start, open source image optimizer',
      mainEntityOfPage: url,
      publisher: {
        '@type': 'Organization',
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl(BRAND_ICON_PATH),
        },
        name: SITE_NAME,
      },
      url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: path.map((item, index) => ({
        '@type': 'ListItem',
        item: item.url,
        name: item.name,
        position: index + 1,
      })),
    },
  ]
}
