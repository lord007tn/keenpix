import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import {
  defineCollections,
  defineConfig,
  defineDocs,
  frontmatterSchema,
} from 'fumadocs-mdx/config'
import { z } from 'zod'

dayjs.extend(customParseFormat)

const publicationDateSchema = z
  .string()
  .refine(
    (value) => dayjs(value, 'YYYY-MM-DD', true).isValid(),
    'Use a valid YYYY-MM-DD publication date',
  )

const blogFrontmatterSchema = frontmatterSchema
  .extend({
    description: z.string(),
    date: publicationDateSchema,
    // Optional last-edited date; defaults to `date` for BlogPosting dateModified
    // and drives article:modified_time. Set it when a post is materially updated.
    updated: publicationDateSchema.optional(),
    language: z.enum(['en', 'ar']).default('en'),
    translationKey: z.string().min(1).optional(),
    author: z.string().default('Keenpix Team'),
    tags: z.array(z.string()).default([]),
    competitor: z.string().optional(),
    // Every published post keeps a versioned Takumi fallback and useful alt
    // text, even when it also supplies static editorial cover/social art.
    image: z.string().startsWith('/og/blog/'),
    imageAlt: z.string().min(1),
    // Optional generated editorial art. `cover` is the visible 1600x900 hero;
    // `ogImage` is its 1200x630 social crop. Posts without authored art keep
    // using the deterministic Takumi image above for every surface.
    cover: z.string().startsWith('/editorial/').optional(),
    coverAlt: z.string().min(1).optional(),
    ogImage: z.string().startsWith('/editorial/').optional(),
    draft: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.updated && dayjs(data.updated).isBefore(dayjs(data.date), 'day')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Updated date cannot be earlier than the publication date',
        path: ['updated'],
      })
    }
  })

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    // Extend (don't replace) the default frontmatter schema so title/description/
    // icon still validate; `updated` is an optional freshness date that flows into
    // the docs WebPage JSON-LD as dateModified and the sitemap as <lastmod>.
    schema: frontmatterSchema.extend({
      updated: publicationDateSchema.optional(),
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
  schema: blogFrontmatterSchema,
  // Full post bodies flow into llms-full.txt — the comparison posts are the
  // site's best GEO asset and must be visible to AI ingestion, not just their
  // one-line descriptions.
  postprocess: {
    includeProcessedMarkdown: true,
  },
})

export default defineConfig()
