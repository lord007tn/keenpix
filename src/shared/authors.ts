// Named, credentialed authors for E-E-A-T and rich-result author attribution. A
// known byline renders as a schema.org Person (with sameAs) in the article
// JSON-LD; an unknown byline falls back to the Organization publisher. Kept free
// of seo/deployment imports so both server metadata and client bylines can share
// it without a circular dependency.
interface Author {
  bio?: string
  name: string
  profilePath?: string
  role?: string
  sameAs?: string[]
}

// Client-safe (no server/env imports) so footers, bylines, and the About page
// can share them without dragging server/env code into the client bundle.
export const SOCIAL_X_URL = 'https://x.com/raedbahriworld'
export const SUPPORT_EMAIL = 'fariq@keenpix.com'

export const FOUNDER: Author = {
  name: 'Raed Bahri',
  profilePath: '/authors/raed-bahri',
  role: 'Founder & maintainer',
  bio: 'Founder and maintainer of Keenpix. Builds image-delivery infrastructure and writes about honest image-CDN pricing and self-hosting.',
  sameAs: [SOCIAL_X_URL],
}

const AUTHORS: Record<string, Author> = {
  [FOUNDER.name]: FOUNDER,
}

// Resolve a frontmatter byline to a known author, or a bare name when unknown
// (which the JSON-LD builders treat as the Organization publisher). Annotated so
// the bare-name fallback still types as Author for optional-field access.
export function getAuthor(name: string) {
  return AUTHORS[name] ?? { name }
}
