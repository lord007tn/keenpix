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
    draft: z.boolean().default(false),
  }),
})

export default defineConfig()
