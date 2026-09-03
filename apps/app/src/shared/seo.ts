import {
  catalogPricing,
  PLANS,
  type PlanPricing,
  STANDARD_PLAN_PRICES,
} from '@/lib/billing/plans'
import { getAppUrl, getRepositoryUrl } from '@/server/deployment'
import {
  BRAND_X_URL,
  FOUNDER,
  getAuthor,
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_NUMBER,
  SUPPORT_WHATSAPP_URL,
} from '@/shared/authors'
import {
  IMAGE_CDN_CALCULATOR_FAQ,
  IMAGE_CDN_PRICING,
} from '@/shared/image-cdn-pricing'

export const SITE_NAME = 'Keenpix'
export const SITE_TITLE = 'Image optimization CDN with honest pricing | Keenpix'
// Kept ~155 chars so the trailing self-host differentiator survives Google's SERP
// snippet truncation (~160). Social cards allow ~200, so they still get it whole.
export const SITE_DESCRIPTION =
  'Keenpix optimizes and delivers AVIF/WebP images from one URL with transparent pricing and unlimited transforms—or self-host the AGPL engine.'
export const SITE_KEYWORDS =
  'image optimization CDN, image CDN, Cloudinary alternative, imgix alternative, ImageKit alternative, WebP, AVIF, sharp image transforms, self-hosted image optimization, open-source image CDN, bandwidth pricing'
export const PRICING_DESCRIPTION =
  'Keenpix starts at $9/month for 100 GB of managed image delivery, with unlimited transforms and teammates, a 14-day trial, and published overage.'
export const BRAND_IMAGE_PATH = '/brand/keenpix-og-card.png'
const BRAND_ICON_PATH = '/android-chrome-512x512.png'
const TWITTER_CREATOR_HANDLE = '@raedbahriworld'
const TWITTER_SITE_HANDLE = '@getkeenpix'
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
  imageAlt,
  locale = 'en_US',
  url,
  type = 'website',
}: {
  title: string
  description?: string
  keywords?: string
  image?: string
  imageAlt?: string
  locale?: 'ar_AR' | 'en_US'
  url?: string
  type?: 'website' | 'article'
}) {
  const imageUrl = image ?? absoluteUrl(BRAND_IMAGE_PATH)
  const imagePath = imageUrl.split('?')[0].toLowerCase()
  let imageType = 'image/png'
  if (imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
    imageType = 'image/jpeg'
  } else if (imagePath.endsWith('.webp')) {
    imageType = 'image/webp'
  } else if (imagePath.endsWith('.avif')) {
    imageType = 'image/avif'
  }
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
    { property: 'og:locale', content: locale },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    ...(url ? [{ property: 'og:url', content: url }] : []),
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:type', content: imageType },
    {
      property: 'og:image:alt',
      content:
        imageAlt ?? `${SITE_NAME} — optimized images, minus the surprise bill`,
    },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:creator', content: TWITTER_CREATOR_HANDLE },
    { name: 'twitter:site', content: TWITTER_SITE_HANDLE },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
    {
      name: 'twitter:image:alt',
      content:
        imageAlt ?? `${SITE_NAME} — optimized images, minus the surprise bill`,
    },
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
  const serverCanonical =
    typeof document === 'undefined'
      ? null
      : document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href
  const requestOrigin =
    typeof window === 'undefined' ? getAppUrl() : window.location.origin
  const origin = serverCanonical
    ? new URL(serverCanonical).origin
    : requestOrigin
  return `${origin}${normalizedPath}`
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
    featureList: [
      'AVIF and WebP image optimization from one URL',
      'Responsive resize, crop, quality, DPR, blur, and format transforms',
      'Origin allowlists, SSRF hardening, and optional signed URLs',
      'Memory, disk, and S3-compatible object-storage caching',
      'Project analytics, request logs, and bandwidth-savings reporting',
      'Managed cloud with unlimited transforms or free AGPL self-hosting',
    ],
    image: absoluteUrl(BRAND_IMAGE_PATH),
    license: `${getRepositoryUrl()}/blob/master/LICENSE`,
    name: SITE_NAME,
    // Free to self-host; the managed-cloud ceiling comes from the plans catalog
    // so this rich-result range can never drift from checkout. AggregateOffer
    // lets search engines surface the price range as a rich result.
    offers: {
      '@type': 'AggregateOffer',
      highPrice: String(STANDARD_PLAN_PRICES.business.priceMonthlyUsd),
      lowPrice: String(PLANS.basic.priceMonthlyUsd),
      offerCount: Object.keys(PLANS).length,
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
      telephone: SUPPORT_WHATSAPP_NUMBER,
      url: SUPPORT_WHATSAPP_URL,
    },
    description: SITE_DESCRIPTION,
    founder: {
      '@type': 'Person',
      name: FOUNDER.name,
      ...(FOUNDER.sameAs ? { sameAs: FOUNDER.sameAs } : {}),
    },
    logo: absoluteUrl(BRAND_ICON_PATH),
    name: SITE_NAME,
    // Keep this limited to properties that belong to Keenpix. The founder's
    // personal X profile remains linked from the founder Person node above.
    sameAs: [getRepositoryUrl(), BRAND_X_URL],
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

export function homePageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${absoluteUrl('/')}#webpage`,
    about: { '@id': SOFTWARE_ID },
    description: SITE_DESCRIPTION,
    inLanguage: 'en',
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: { '@id': SOFTWARE_ID },
    name: SITE_TITLE,
    primaryImageOfPage: absoluteUrl(BRAND_IMAGE_PATH),
    publisher: { '@id': ORGANIZATION_ID },
    url: absoluteUrl('/'),
  }
}

export function authorProfileJsonLd() {
  const profileUrl = absoluteUrl(FOUNDER.profilePath ?? '/authors/raed-bahri')
  const personId = `${profileUrl}#person`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': `${profileUrl}#profile`,
        dateModified: '2026-07-12',
        description: FOUNDER.bio,
        inLanguage: 'en',
        isPartOf: { '@id': WEBSITE_ID },
        mainEntity: { '@id': personId },
        name: `${FOUNDER.name} — ${FOUNDER.role}`,
        url: profileUrl,
      },
      {
        '@type': 'Person',
        '@id': personId,
        description: FOUNDER.bio,
        jobTitle: FOUNDER.role,
        name: FOUNDER.name,
        sameAs: FOUNDER.sameAs,
        url: profileUrl,
        worksFor: { '@id': ORGANIZATION_ID },
      },
    ],
  }
}

export function pricingPageJsonLd(
  pricing: PlanPricing = catalogPricing('standard'),
) {
  const catalogId = `${absoluteUrl('/pricing')}#offers`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        logo: absoluteUrl(BRAND_ICON_PATH),
        name: SITE_NAME,
        url: absoluteUrl('/'),
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: SITE_NAME,
        publisher: { '@id': ORGANIZATION_ID },
        url: absoluteUrl('/'),
      },
      {
        '@type': 'WebPage',
        '@id': `${absoluteUrl('/pricing')}#webpage`,
        about: { '@id': SOFTWARE_ID },
        description: PRICING_DESCRIPTION,
        hasPart: { '@id': catalogId },
        inLanguage: 'en',
        isPartOf: { '@id': WEBSITE_ID },
        mainEntity: { '@id': SOFTWARE_ID },
        name: `Image CDN Pricing | ${SITE_NAME}`,
        publisher: { '@id': ORGANIZATION_ID },
        url: absoluteUrl('/pricing'),
      },
      {
        '@type': 'SoftwareApplication',
        '@id': SOFTWARE_ID,
        applicationCategory: 'DeveloperApplication',
        name: SITE_NAME,
        publisher: { '@id': ORGANIZATION_ID },
        url: absoluteUrl('/'),
      },
      {
        '@type': 'OfferCatalog',
        '@id': catalogId,
        itemListElement: Object.values(PLANS).map((plan) => ({
          '@type': 'Offer',
          availability: 'https://schema.org/InStock',
          category: 'monthly subscription',
          itemOffered: { '@id': SOFTWARE_ID },
          name: `${plan.name} monthly`,
          price: String(pricing.plans[plan.id].month.amountCents / 100),
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            billingDuration: 'P1M',
            price: String(pricing.plans[plan.id].month.amountCents / 100),
            priceCurrency: 'USD',
          },
          url: absoluteUrl('/pricing'),
        })),
        name: 'Keenpix managed cloud plans',
        numberOfItems: Object.keys(PLANS).length,
        url: absoluteUrl('/pricing'),
      },
    ],
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
  language: 'ar' | 'en' = 'en',
) {
  const arabic = language === 'ar'
  const listingUrl = absoluteUrl(arabic ? '/blog/ar' : '/blog')
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${listingUrl}#blog`,
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      datePublished: post.date,
      description: post.description,
      headline: post.title,
      url: post.url,
    })),
    description: arabic
      ? 'أدلة عملية عن تحسين الصور، صيغ AVIF وWebP، وتشغيل Keenpix على البنية التي تختارها.'
      : 'Guides on image optimization, transparent bandwidth pricing, and how Keenpix compares to Cloudinary, imgix, and ImageKit.',
    inLanguage: language,
    name: arabic ? `مدونة ${SITE_NAME}` : `${SITE_NAME} Blog`,
    publisher: { '@id': ORGANIZATION_ID },
    url: listingUrl,
  }
}

export function comparisonPageJsonLd({
  dateModified,
  description,
  name,
  path,
  url,
}: {
  dateModified: string
  description: string
  name: string
  path: Array<{ name: string; url: string }>
  url: string
}) {
  const profileUrl = absoluteUrl(FOUNDER.profilePath ?? '/authors/raed-bahri')
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      about: { '@id': SOFTWARE_ID },
      dateModified,
      description,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      mainEntity: { '@id': SOFTWARE_ID },
      name,
      publisher: { '@id': ORGANIZATION_ID },
      reviewedBy: { '@id': `${profileUrl}#person` },
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

export function marketingPageJsonLd({
  description,
  name,
  path,
  url,
}: {
  description: string
  name: string
  path: Array<{ name: string; url: string }>
  url: string
}) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      about: { '@id': SOFTWARE_ID },
      description,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      mainEntity: { '@id': SOFTWARE_ID },
      name,
      publisher: { '@id': ORGANIZATION_ID },
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

export function comparisonListingJsonLd(
  items: Array<{ name: string; url: string }>,
) {
  const url = absoluteUrl('/compare')
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${url}#webpage`,
      about: { '@id': SOFTWARE_ID },
      description:
        'Source-backed image CDN comparisons with dated pricing, feature matrices, migration guidance, and clear best-fit tradeoffs.',
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      mainEntity: { '@id': `${url}#comparisons` },
      name: 'Keenpix image CDN comparisons',
      publisher: { '@id': ORGANIZATION_ID },
      url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': `${url}#comparisons`,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        item: item.url,
        name: item.name,
        position: index + 1,
      })),
      numberOfItems: items.length,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          item: absoluteUrl('/'),
          name: 'Keenpix',
          position: 1,
        },
        {
          '@type': 'ListItem',
          item: url,
          name: 'Compare',
          position: 2,
        },
      ],
    },
  ]
}

export function imageCdnCalculatorJsonLd() {
  const url = absoluteUrl('/image-cdn-cost-calculator')
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${url}#calculator`,
      applicationCategory: 'BusinessApplication',
      browserRequirements: 'Requires JavaScript',
      description:
        'A source-dated calculator for comparing image CDN cost boundaries across ten providers.',
      isAccessibleForFree: true,
      name: 'Image CDN Cost Calculator',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      operatingSystem: 'Any',
      url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      dateModified: IMAGE_CDN_PRICING.verifiedAt,
      description:
        'Compare source-dated image CDN cost estimates while preserving vendor-specific billing boundaries and limitations.',
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      mainEntity: { '@id': `${url}#calculator` },
      name: 'Image CDN Cost Calculator',
      publisher: { '@id': ORGANIZATION_ID },
      url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: IMAGE_CDN_CALCULATOR_FAQ.map((item) => ({
        '@type': 'Question',
        acceptedAnswer: { '@type': 'Answer', text: item.a },
        name: item.q,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          item: absoluteUrl('/'),
          name: 'Keenpix',
          position: 1,
        },
        {
          '@type': 'ListItem',
          item: url,
          name: 'Image CDN Cost Calculator',
          position: 2,
        },
      ],
    },
  ]
}

// BlogPosting + breadcrumb graph for a single article. Dated and attributed so
// search engines can surface it as blog content, unlike undated docs WebPages.
export function blogPostingJsonLd({
  author,
  datePublished,
  dateModified,
  description,
  image,
  language = 'en',
  path,
  title,
  url,
}: {
  author: string
  datePublished: string
  dateModified?: string
  description: string
  image: string
  language?: 'ar' | 'en'
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
        ...(person.profilePath
          ? {
              '@id': `${absoluteUrl(person.profilePath)}#person`,
              url: absoluteUrl(person.profilePath),
            }
          : {}),
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
      image,
      inLanguage: language,
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
      '@type': 'WebPage',
      about: SITE_NAME,
      author: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
      // Only emitted when the doc's frontmatter carries an `updated` date, so we
      // never stamp a fake freshness signal on undated reference pages.
      ...(dateModified ? { dateModified } : {}),
      description,
      image: absoluteUrl(BRAND_IMAGE_PATH),
      inLanguage: 'en',
      isPartOf: {
        '@type': 'WebSite',
        name: 'Keenpix documentation',
        url: absoluteUrl('/docs'),
      },
      keywords:
        'self-hosted image optimization, image CDN, sharp, Postgres, TanStack Start, open source image optimizer',
      name: title,
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
