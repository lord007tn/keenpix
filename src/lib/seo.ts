import { getAppUrl, getRepositoryUrl } from '@/lib/deployment'

export const SITE_NAME = 'Keenpix'
export const SITE_TITLE = 'Keenpix - self-hosted image optimization'
export const SITE_DESCRIPTION =
  'Self-hosted image optimization for teams that want a fast, secure, open-source image pipeline with sharp transforms, disk caching, analytics, and one drop-in URL.'
export const SITE_KEYWORDS =
  'Keenpix, self-hosted image optimization, open-source image CDN, sharp image transforms, image proxy, WebP, AVIF, Docker image optimizer'
export const BRAND_IMAGE_PATH = '/brand/keenpix-og.png'
export const BRAND_ICON_PATH = '/logo512.png'
export const APP_VERSION = import.meta.env.VITE_APP_VERSION

export function pageTitle(title: string) {
  return `${title} - ${SITE_NAME}`
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

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    applicationCategory: 'DeveloperApplication',
    codeRepository: getRepositoryUrl(),
    description: SITE_DESCRIPTION,
    image: absoluteUrl(BRAND_IMAGE_PATH),
    license: `${getRepositoryUrl()}/blob/master/LICENSE`,
    name: SITE_NAME,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    operatingSystem: 'Linux, macOS, Windows',
    softwareVersion: APP_VERSION,
    url: absoluteUrl('/'),
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
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
    description: SITE_DESCRIPTION,
    image: absoluteUrl(BRAND_IMAGE_PATH),
    name: SITE_NAME,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    url: absoluteUrl('/'),
  }
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
        '@type': 'TechArticle',
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
