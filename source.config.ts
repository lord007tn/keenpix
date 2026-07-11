import {
  defineCollections,
  defineConfig,
  defineDocs,
  frontmatterSchema,
} from 'fumadocs-mdx/config'
import { z } from 'zod'

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    // Extend (don't replace) the default frontmatter schema so title/description/
    // icon still validate; `updated` is an optional freshness date that flows into
    // the docs TechArticle JSON-LD as dateModified and the sitemap as <lastmod>.
    schema: frontmatterSchema.extend({
      updated: z.string().optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

// Blog + SEO comparison content, rendered by /blog with its own layout (not the
// docs sidebar). Frontmatter carries publishing metadata plus an optional
// `competitor` tag so "Keenpix vs X" pages can be grouped and cross-linked.
export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  schema: frontmatterSchema.extend({
    description: z.string(),
    date: z.string(),
    // Optional last-edited date; defaults to `date` for BlogPosting dateModified
    // and drives article:modified_time. Set it when a post is materially updated.
    updated: z.string().optional(),
    author: z.string().default('Keenpix Team'),
    tags: z.array(z.string()).default([]),
    competitor: z.string().optional(),
    // Every published post must carry a versioned Takumi image path and useful
    // visible-image alt text. This keeps the listing, article hero, OG metadata,
    // and immutable cache key on one editorial source of truth.
    image: z.string().startsWith('/og/blog/'),
    imageAlt: z.string().min(1),
    draft: z.boolean().default(false),
  }),
  // Full post bodies flow into llms-full.txt — the comparison posts are the
  // site's best GEO asset and must be visible to AI ingestion, not just their
  // one-line descriptions.
  postprocess: {
    includeProcessedMarkdown: true,
  },
})

export default defineConfig()
