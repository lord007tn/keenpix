import { getAppUrl, getRepositoryUrl } from '@/lib/deployment'

export const SITE_NAME = 'Keenpix'
export const SITE_DESCRIPTION =
  'Open-source, self-hosted image optimization with sharp, Postgres, disk caching, analytics, and a drop-in transform API.'

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
    image: absoluteUrl('/brand/keenpix-og.png'),
    license: `${getRepositoryUrl()}/blob/master/LICENSE`,
    name: SITE_NAME,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    operatingSystem: 'Linux, macOS, Windows',
    softwareVersion: '0.1.0',
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
      image: absoluteUrl('/brand/keenpix-og.png'),
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
          url: absoluteUrl('/logo512.png'),
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
