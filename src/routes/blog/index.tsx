import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { BlogIndex } from '@/features/blog/blog-index'
import { isCloud } from '@/server/deployment'
import { listBlogPosts } from '@/shared/blog-source'
import { absoluteUrl, seo } from '@/shared/seo'

const listBlogPostsFn = createServerFn({ method: 'GET' }).handler(() => ({
  posts: listBlogPosts(),
  selfHost: !isCloud(),
}))

export const Route = createFileRoute('/blog/')({
  loader: () => listBlogPostsFn(),
  head: ({ loaderData }) => {
    const canonicalUrl = absoluteUrl('/blog')
    return {
      links: [{ rel: 'canonical', href: canonicalUrl }],
      meta: [
        ...seo({
          title: 'Blog - Keenpix',
          description:
            'Guides on image optimization, transparent bandwidth pricing, and how Keenpix compares to Cloudinary, imgix, ImageKit, and more.',
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
  const { posts } = Route.useLoaderData()
  return <BlogIndex posts={posts} />
}
