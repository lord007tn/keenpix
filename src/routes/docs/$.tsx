import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import browserCollections from 'collections/browser'
import { useFumadocsLoader } from 'fumadocs-core/source/client'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import { Suspense } from 'react'
import { getMDXComponents } from '@/components/mdx'
import { getAppUrl, isSelfHosted } from '@/lib/deployment'
import { baseOptions } from '@/lib/layout.shared'
import { absoluteUrl, docsJsonLd } from '@/lib/seo'
import { source } from '@/lib/source'
import docsCss from '@/styles/docs.css?url'

interface DocsLoaderData {
  breadcrumbs: Array<{ name: string; url: string }>
  canonicalUrl: string
  description?: string
  ogImage?: string
  pageTree: Awaited<ReturnType<typeof source.serializePageTree>>
  path: string
  selfHost: boolean
  title?: string
}

export const Route = createFileRoute('/docs/$')({
  // Fumadocs styles are scoped to /docs via this stylesheet — the rest of the
  // app is unaffected.
  head: ({ loaderData }: { loaderData?: DocsLoaderData }) => {
    const title = loaderData?.title
      ? `${loaderData.title} - Keenpix docs`
      : 'Keenpix docs'
    const description =
      loaderData?.description ??
      'Self-hosted image optimization, caching, analytics, and transform API documentation.'

    return {
      headScripts: loaderData
        ? [
            {
              type: 'application/ld+json',
              children: JSON.stringify(
                docsJsonLd({
                  description,
                  path: loaderData.breadcrumbs,
                  title,
                  url: loaderData.canonicalUrl,
                }),
              ),
            },
          ]
        : undefined,
      links: [
        { rel: 'stylesheet', href: docsCss },
        {
          rel: 'canonical',
          href: loaderData?.canonicalUrl ?? absoluteUrl('/docs'),
        },
      ],
      meta: [
        { title },
        { name: 'description', content: description },
        ...(loaderData?.selfHost
          ? [{ name: 'robots', content: 'noindex,nofollow' }]
          : []),
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'article' },
        { property: 'og:url', content: loaderData?.canonicalUrl },
        { property: 'og:image', content: loaderData?.ogImage },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: loaderData?.ogImage },
      ],
    }
  },
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/').filter(Boolean) ?? []
    const data = (await serverLoader({ data: slugs })) as DocsLoaderData
    await clientLoader.preload(data.path)
    return data
  },
})

const serverLoader = createServerFn({ method: 'GET' })
  .inputValidator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs)
    if (!page) {
      throw notFound()
    }

    const ogPath =
      page.slugs.length > 0
        ? `/og/docs/${page.slugs.join('/')}.webp`
        : '/og/docs/index.webp'

    return {
      breadcrumbs: [
        { name: 'Keenpix', url: getAppUrl() },
        { name: 'Docs', url: `${getAppUrl()}/docs` },
        { name: page.data.title, url: `${getAppUrl()}${page.url}` },
      ],
      canonicalUrl: `${getAppUrl()}${page.url}`,
      selfHost: isSelfHosted(),
      path: page.path,
      title: page.data.title,
      description: page.data.description,
      ogImage: `${getAppUrl()}${ogPath}`,
      pageTree: await source.serializePageTree(source.getPageTree()),
    }
  })

const clientLoader = browserCollections.docs.createClientLoader({
  component({ toc, frontmatter, default: MDX }) {
    return (
      <DocsPage toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <MDX components={getMDXComponents()} />
        </DocsBody>
      </DocsPage>
    )
  },
})

function Page() {
  const { path, pageTree } = useFumadocsLoader(
    Route.useLoaderData() as DocsLoaderData,
  )

  return (
    // theme.enabled=false → reuse the app's existing next-themes provider.
    <RootProvider theme={{ enabled: false }}>
      <DocsLayout {...baseOptions()} tree={pageTree}>
        <Suspense>{clientLoader.useContent(path)}</Suspense>
      </DocsLayout>
    </RootProvider>
  )
}
