import { defineHandler, redirect } from 'nitro/h3'
import { RETIRED_ARABIC_BLOG_REDIRECTS } from '@/shared/blog-redirects'

const DELIVERY_PATH_PREFIXES = ['/api/', '/cdn-cgi/', '/img/', '/og/', '/p/']
const PUBLIC_PAGE_PREFIXES = [
  '/about',
  '/authors',
  '/blog',
  '/changelog',
  '/compare',
  '/developers',
  '/docs',
  '/image-cdn-cost-calculator',
  '/legal',
  '/methodology',
  '/pricing',
  '/security',
  '/self-hosted-image-cdn',
  '/status',
  '/support',
]
const REPEATED_SLASHES = /\/{2,}/g

function isPublicPagePath(pathname: string) {
  return (
    pathname === '/' ||
    PUBLIC_PAGE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  )
}

export function getCanonicalRedirect(method: string, url: URL) {
  if (
    (method !== 'GET' && method !== 'HEAD') ||
    DELIVERY_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  ) {
    return
  }

  const collapsedPathname = url.pathname.replace(REPEATED_SLASHES, '/')
  const publicPathname = collapsedPathname.toLowerCase()
  const pathnameWithoutSlash =
    publicPathname !== '/' && publicPathname.endsWith('/')
      ? publicPathname.slice(0, -1)
      : publicPathname
  const markdown = pathnameWithoutSlash.endsWith('.md')
  const redirectLookup = markdown
    ? pathnameWithoutSlash.slice(0, -3)
    : pathnameWithoutSlash
  const retiredBlogTarget = Reflect.get(
    RETIRED_ARABIC_BLOG_REDIRECTS,
    redirectLookup,
  )
  if (typeof retiredBlogTarget === 'string') {
    return `${retiredBlogTarget}${markdown ? '.md' : ''}${url.search}`
  }

  let canonicalPathname = isPublicPagePath(publicPathname)
    ? publicPathname
    : url.pathname

  if (canonicalPathname !== '/' && canonicalPathname.endsWith('/')) {
    canonicalPathname = canonicalPathname.slice(0, -1)
  }

  if (canonicalPathname === url.pathname) {
    return
  }

  return `${canonicalPathname}${url.search}`
}

export default defineHandler((event) => {
  const target = getCanonicalRedirect(event.req.method, event.url)
  if (target) {
    return redirect(target, 308)
  }
})
