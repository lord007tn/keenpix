import { PLANS } from '@/lib/billing/plans'
import { getAppUrl, getRepositoryUrl } from '@/server/deployment'
import {
  FOUNDER,
  getAuthor,
  SOCIAL_X_URL,
  SUPPORT_EMAIL,
} from '@/shared/authors'

export const SITE_NAME = 'Keenpix'
export const SITE_TITLE =
  'Keenpix — image optimization CDN with honest pricing, or self-host free'
// Kept ~155 chars so the trailing self-host differentiator survives Google's SERP
// snippet truncation (~160). Social cards allow ~200, so they still get it whole.
export const SITE_DESCRIPTION =
  'Keenpix optimizes and delivers your images as AVIF/WebP from one URL — transparent bandwidth pricing, unlimited transforms, no lock-in. Or self-host free.'
export const SITE_KEYWORDS =
  'image optimization CDN, image CDN, Cloudinary alternative, imgix alternative, ImageKit alternative, WebP, AVIF, sharp image transforms, self-hosted image optimization, open-source image CDN, bandwidth pricing'
export const BRAND_IMAGE_PATH = '/brand/keenpix-og.png'
const BRAND_ICON_PATH = '/logo512.png'
// Twitter attribution handle reused across the card meta tags.
const TWITTER_HANDLE = '@raedbahriworld'
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
    // Enable large image previews + full snippets in Google and AI results. Pages
    // that must not be indexed append their own robots:noindex after seo(), which
    // wins via head deduplication (deepest/last descriptor with the same name).
    {
      name: 'robots',
      content:
        'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    },
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
    { name: 'twitter:site', content: TWITTER_HANDLE },
    { name: 'twitter:creator', content: TWITTER_HANDLE },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
    { name: 'twitter:image:alt', content: `${SITE_NAME} modular image mark` },
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
    // Free to self-host; the managed-cloud ceiling comes from the plans catalog
    // so this rich-result range can never drift from checkout. AggregateOffer
    // lets search engines surface the price range as a rich result.
    offers: {
      '@type': 'AggregateOffer',
      highPrice: String(PLANS.business.priceMonthlyUsd),
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
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: SUPPORT_EMAIL,
    },
    description: SITE_DESCRIPTION,
    founder: {
      '@type': 'Person',
      name: FOUNDER.name,
      ...(FOUNDER.sameAs ? { sameAs: FOUNDER.sameAs } : {}),
    },
    logo: absoluteUrl(BRAND_ICON_PATH),
    name: SITE_NAME,
    // Repo + official social profile give the Knowledge Graph corroborating
    // signals to resolve and cite the Keenpix entity.
    sameAs: [getRepositoryUrl(), SOCIAL_X_URL],
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
    inLanguage: 'en',
    name: SITE_NAME,
    publisher: { '@id': ORGANIZATION_ID },
    url: absoluteUrl('/'),
  }
}

// Blog collection node for /blog so the listing is a first-class entity (a Blog
// carrying its posts) rather than just a page of links — clearer for crawlers and
// AI engines mapping the site's content.
export function blogListingJsonLd(
  posts: Array<{
    date: string
    description: string
    title: string
    url: string
  }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${absoluteUrl('/blog')}#blog`,
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      datePublished: post.date,
      description: post.description,
      headline: post.title,
      url: post.url,
    })),
    description:
      'Guides on image optimization, transparent bandwidth pricing, and how Keenpix compares to Cloudinary, imgix, and ImageKit.',
    inLanguage: 'en',
    name: `${SITE_NAME} Blog`,
    publisher: { '@id': ORGANIZATION_ID },
    url: absoluteUrl('/blog'),
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
  dateModified,
  description,
  path,
  title,
  url,
}: {
  author: string
  datePublished: string
  dateModified?: string
  description: string
  path: Array<{ name: string; url: string }>
  title: string
  url: string
}) {
  const person = getAuthor(author)
  // A known byline (has sameAs) becomes a schema.org Person for author E-E-A-T;
  // an unknown one stays an Organization so we never invent a fake identity.
  const authorNode = person.sameAs?.length
    ? {
        '@type': 'Person',
        name: person.name,
        ...(person.role ? { jobTitle: person.role } : {}),
        ...(person.bio ? { description: person.bio } : {}),
        sameAs: person.sameAs,
      }
    : { '@type': 'Organization', name: person.name }

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      author: authorNode,
      datePublished,
      dateModified: dateModified ?? datePublished,
      description,
      headline: title,
      image: absoluteUrl(BRAND_IMAGE_PATH),
      inLanguage: 'en',
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
  dateModified,
  description,
  path,
  title,
  url,
}: {
  dateModified?: string
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
      // Only emitted when the doc's frontmatter carries an `updated` date, so we
      // never stamp a fake freshness signal on undated reference pages.
      ...(dateModified ? { dateModified } : {}),
      description,
      headline: title,
      image: absoluteUrl(BRAND_IMAGE_PATH),
      inLanguage: 'en',
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
