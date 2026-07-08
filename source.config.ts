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
    author: z.string().default('Keenpix Team'),
    tags: z.array(z.string()).default([]),
    competitor: z.string().optional(),
    draft: z.boolean().default(false),
  }),
})

export default defineConfig()
