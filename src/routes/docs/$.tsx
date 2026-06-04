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
import {
  absoluteUrl,
  BRAND_IMAGE_PATH,
  docsJsonLd,
  SITE_NAME,
  seo,
} from '@/lib/seo'
import { source } from '@/lib/source'
import { docsSlugsSchema } from '@/schemas/docs'
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
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/').filter(Boolean) ?? []
    const data = (await serverLoader({ data: slugs })) as DocsLoaderData
    await clientLoader.preload(data.path)
    return data
  },
  head: ({ loaderData }: { loaderData?: DocsLoaderData }) => {
    const title =
      loaderData?.title && loaderData.title !== SITE_NAME
        ? `${loaderData.title} - Keenpix docs`
        : 'Keenpix docs'
    const description =
      loaderData?.description ??
      'Self-hosted image optimization, caching, analytics, and transform API documentation.'
    const canonicalUrl = loaderData?.canonicalUrl ?? absoluteUrl('/docs')
    const ogImage = loaderData?.ogImage ?? absoluteUrl(BRAND_IMAGE_PATH)

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
                  url: canonicalUrl,
                }),
              ),
            },
          ]
        : undefined,
      links: [
        { rel: 'stylesheet', href: docsCss },
        {
          rel: 'canonical',
          href: canonicalUrl,
        },
      ],
      meta: [
        ...seo({
          title,
          description,
          image: ogImage,
          url: canonicalUrl,
          type: 'article',
        }),
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
    <RootProvider theme={{ enabled: false }}>
      <DocsLayout
        links={[
          { text: 'Dashboard', url: '/app' },
          { text: 'Home', url: '/' },
        ]}
        nav={{ title: 'Keenpix docs' }}
        tree={pageTree}
      >
        <Suspense>{clientLoader.useContent(path)}</Suspense>
      </DocsLayout>
    </RootProvider>
  )
}
