import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { LearningHub } from '@/features/learn/learning-hub'
import { listBlogPosts } from '@/shared/blog-source'
import { LEARNING_GUIDE_CLASSIFICATION } from '@/shared/learning-content'
import { absoluteUrl, seo } from '@/shared/seo'

const listLearningPosts = createServerFn({ method: 'GET' }).handler(() =>
  listBlogPosts()
    .filter((post) => post.slug in LEARNING_GUIDE_CLASSIFICATION)
    .map(({ description, slug, title, url }) => ({
      description,
      slug,
      title,
      url,
    })),
)

export const Route = createFileRoute('/learn')({
  loader: () => listLearningPosts(),
  head: () => {
    const canonicalUrl = absoluteUrl('/learn')
    return {
      links: [{ rel: 'canonical', href: canonicalUrl }],
      meta: seo({
        title: 'Keenpix Learn — image CDN answers and implementation guides',
        description:
          'Learn image CDN fundamentals, performance, cost, origins, security, operations, migrations, frameworks, and safe agent-assisted integration.',
        url: canonicalUrl,
      }),
    }
  },
  component: Learn,
})

function Learn() {
  return <LearningHub posts={Route.useLoaderData()} />
}
