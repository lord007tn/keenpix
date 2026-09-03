const PUBLIC_KNOWLEDGE_PATHS = new Set([
  '/',
  '/about',
  '/authors/raed-bahri',
  '/blog',
  '/blog/ar',
  '/changelog',
  '/compare',
  '/developers',
  '/image-cdn-cost-calculator',
  '/learn',
  '/legal/dpa',
  '/legal/license',
  '/legal/privacy',
  '/legal/terms',
  '/methodology/comparisons',
  '/pricing',
  '/security',
  '/self-hosted-image-cdn',
  '/status',
  '/support',
])
const TRAILING_SLASH = /\/$/
const FILE_PATH = /\/[^/]+\.[^/]+$/

export function isPublicKnowledgePath(pathname: string) {
  if (FILE_PATH.test(pathname)) {
    return false
  }
  return (
    PUBLIC_KNOWLEDGE_PATHS.has(pathname) ||
    pathname.startsWith('/blog/') ||
    pathname.startsWith('/compare/') ||
    pathname.startsWith('/docs/') ||
    pathname === '/docs'
  )
}

export function getMarkdownPathname(pathname: string) {
  return pathname === '/'
    ? '/index.md'
    : `${pathname.replace(TRAILING_SLASH, '')}.md`
}

export function getCanonicalPathname(markdownPathname: string) {
  if (markdownPathname === '/index.md') {
    return '/'
  }
  if (!markdownPathname.endsWith('.md')) {
    return null
  }
  const pathname = markdownPathname.slice(0, -3)
  return pathname || null
}
