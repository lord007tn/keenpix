import { blog } from 'collections/server'
import { loader } from 'fumadocs-core/source'
import { toFumadocsSource } from 'fumadocs-mdx/runtime/server'

// Fumadocs content source for /blog, backed by content/blog/*.mdx. The blog is a
// flat `doc` collection (no meta/page-tree like docs), so we build the source
// from its pages directly with an empty meta list.
export const blogSource = loader({
  baseUrl: '/blog',
  source: toFumadocsSource(blog, []),
})

export interface BlogListItem {
  author: string
  competitor?: string
  date: string
  description: string
  image: string
  imageAlt: string
  slug: string
  tags: string[]
  title: string
  url: string
}

// Published, non-draft posts newest-first — the shape the index route needs
// (drops the MDX body/methods, keeps only serializable frontmatter).
export function listBlogPosts(): BlogListItem[] {
  return blogSource
    .getPages()
    .filter((page) => !page.data.draft)
    .map((page) => ({
      author: page.data.author,
      competitor: page.data.competitor,
      date: page.data.date,
      description: page.data.description,
      image: page.data.image,
      imageAlt: page.data.imageAlt,
      slug: page.slugs.join('/'),
      tags: page.data.tags,
      title: page.data.title,
      url: page.url,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}
