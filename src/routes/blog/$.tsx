import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import browserCollections from 'collections/browser'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import { Suspense } from 'react'
import { JsonLd } from '@/components/app/json-ld'
import { getMDXComponents } from '@/components/mdx'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'
import { BlogPostCta, BlogPostHeader } from '@/features/blog/blog-post-layout'
import { docsSlugsSchema } from '@/schemas/docs'
import { getAppUrl, isCloud } from '@/server/deployment'
import { getAuthor } from '@/shared/authors'
import { blogSource } from '@/shared/blog-source'
import {
  absoluteUrl,
  BRAND_IMAGE_PATH,
  blogPostingJsonLd,
  seo,
} from '@/shared/seo'
import docsCss from '@/styles/docs.css?url'

interface BlogLoaderData {
  author: string
  authorUrl: string | null
  canonicalUrl: string
  competitor?: string
  date: string
  description: string
  jsonLd: ReturnType<typeof blogPostingJsonLd> | null
  ogImage: string
  path: string
  selfHost: boolean
  tags: string[]
  title: string
  updated: string
}

export const Route = createFileRoute('/blog/$')({
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/').filter(Boolean) ?? []
    const data = (await serverLoader({ data: slugs })) as BlogLoaderData
    await clientLoader.preload(data.path)
    return data
  },
  head: ({ loaderData }: { loaderData?: BlogLoaderData }) => {
    const title = loaderData?.title
      ? `${loaderData.title} - Keenpix Blog`
      : 'Keenpix Blog'
    const description =
      loaderData?.description ??
      'Image optimization, pricing, and comparisons from the Keenpix team.'
    const canonicalUrl = loaderData?.canonicalUrl ?? absoluteUrl('/blog')

    return {
      links: [
        { rel: 'stylesheet', href: docsCss },
        { rel: 'canonical', href: canonicalUrl },
      ],
      meta: [
        ...seo({
          title,
          description,
          image: loaderData?.ogImage ?? absoluteUrl(BRAND_IMAGE_PATH),
          url: canonicalUrl,
          type: 'article',
        }),
        // article:* Open Graph tags for social platforms (Google reads dates from
        // the BlogPosting JSON-LD instead). Emitted only with real loader data.
        ...(loaderData
          ? [
              { property: 'article:published_time', content: loaderData.date },
              {
                property: 'article:modified_time',
                content: loaderData.updated,
              },
              ...(loaderData.authorUrl
                ? [
                    {
                      property: 'article:author',
                      content: loaderData.authorUrl,
                    },
                  ]
                : []),
              ...loaderData.tags.map((tag) => ({
                property: 'article:tag',
                content: tag,
              })),
            ]
          : []),
        ...(loaderData?.selfHost
          ? [{ name: 'robots', content: 'noindex,nofollow' }]
          : []),
      ],
    }
  },
  component: Page,
})

const serverLoader = createServerFn({ method: 'GET' })
  .inputValidator(docsSlugsSchema)
  .handler(({ data: slugs }) => {
    const page = blogSource.getPage(slugs)
    if (!page) {
      throw notFound()
    }
    const canonicalUrl = `${getAppUrl()}${page.url}`
    const selfHost = !isCloud()
    const breadcrumbs = [
      { name: 'Keenpix', url: getAppUrl() },
      { name: 'Blog', url: `${getAppUrl()}/blog` },
      { name: page.data.title, url: canonicalUrl },
    ]

    const updated = page.data.updated ?? page.data.date

    return {
      author: page.data.author,
      // OG expects article:author to be a profile URL, not a bare name.
      authorUrl: getAuthor(page.data.author)?.sameAs?.[0] ?? null,
      canonicalUrl,
      competitor: page.data.competitor,
      date: page.data.date,
      description: page.data.description,
      ogImage: `${getAppUrl()}/og/blog/${page.slugs.join('/')}`,
      path: page.path,
      selfHost,
      tags: page.data.tags,
      title: page.data.title,
      updated,
      // Built here so the JSON-LD shares one source of truth with the page's
      // canonical URL; rendered as an SSR <script> in Page(). Suppressed on
      // self-host (the marketing surface is noindex there).
      jsonLd: selfHost
        ? null
        : blogPostingJsonLd({
            author: page.data.author,
            datePublished: page.data.date,
            dateModified: updated,
            description: page.data.description,
            path: breadcrumbs,
            title: page.data.title,
            url: canonicalUrl,
          }),
    }
  })

const clientLoader = browserCollections.blog.createClientLoader({
  component({ frontmatter, default: MDX }) {
    return (
      <>
        <BlogPostHeader
          meta={{
            author: frontmatter.author,
            competitor: frontmatter.competitor,
            date: frontmatter.date,
            description: frontmatter.description,
            tags: frontmatter.tags,
            title: frontmatter.title,
          }}
        />
        <article className="prose mx-auto max-w-3xl px-6 py-10">
          <MDX components={getMDXComponents()} />
        </article>
        <BlogPostCta />
      </>
    )
  },
})

function Page() {
  const loaderData = Route.useLoaderData() as BlogLoaderData

  return (
    <div className="min-h-svh bg-background">
      <RootProvider theme={{ enabled: false }}>
        {loaderData.jsonLd ? <JsonLd data={loaderData.jsonLd} /> : null}
        <SiteHeader />
        <main id="main-content">
          <Suspense>{clientLoader.useContent(loaderData.path)}</Suspense>
        </main>
        <SiteFooter />
      </RootProvider>
    </div>
  )
}
