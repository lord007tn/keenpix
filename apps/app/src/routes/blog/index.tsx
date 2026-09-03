import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { JsonLd } from '@/components/app/json-ld'
import { BlogIndex } from '@/features/blog/blog-index'
import { isCloud } from '@/server/deployment'
import { listBlogPosts } from '@/shared/blog-source'
import { absoluteUrl, blogListingJsonLd, seo } from '@/shared/seo'

const listBlogPostsFn = createServerFn({ method: 'GET' }).handler(() => {
  const posts = listBlogPosts()
  const selfHost = !isCloud()
  const canonicalUrl = absoluteUrl('/blog')
  return {
    canonicalUrl,
    posts,
    selfHost,
    // Blog collection JSON-LD (absolute post URLs); suppressed on self-host,
    // whose marketing surface is noindex.
    jsonLd: selfHost
      ? null
      : blogListingJsonLd(
          posts.map((post) => ({
            date: post.date,
            description: post.description,
            title: post.title,
            url: absoluteUrl(post.url),
          })),
        ),
  }
})

export const Route = createFileRoute('/blog/')({
  loader: () => listBlogPostsFn(),
  head: ({ loaderData }) => {
    const canonicalUrl = loaderData?.canonicalUrl ?? absoluteUrl('/blog')
    return {
      links: [
        { rel: 'canonical', href: canonicalUrl },
        { rel: 'alternate', hrefLang: 'en', href: canonicalUrl },
        { rel: 'alternate', hrefLang: 'x-default', href: canonicalUrl },
      ],
      meta: [
        ...seo({
          title: 'Image CDN Guides, Comparisons & Pricing | Keenpix',
          description:
            'Guides on image optimization, transparent managed-delivery pricing, and how Keenpix compares to Cloudinary, imgix, ImageKit, and more.',
          url: canonicalUrl,
        }),
        ...(loaderData?.selfHost
          ? [{ name: 'robots', content: 'noindex,nofollow' }]
          : []),
      ],
    }
  },
  component: BlogIndexPage,
})

function BlogIndexPage() {
  const { posts, jsonLd } = Route.useLoaderData()
  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <BlogIndex posts={posts} />
    </>
  )
}
