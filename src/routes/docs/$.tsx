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
import { JsonLd } from '@/components/app/json-ld'
import { getMDXComponents } from '@/components/mdx'
import { DocsMainContainer } from '@/features/docs/docs-main-container'
import { docsSlugsSchema } from '@/schemas/docs'
import { getAppUrl, isCloud } from '@/server/deployment'
import { source } from '@/shared/docs-source'
import {
  absoluteUrl,
  BRAND_IMAGE_PATH,
  docsJsonLd,
  SITE_NAME,
  seo,
} from '@/shared/seo'
import docsCss from '@/styles/docs.css?url'

interface DocsLoaderData {
  breadcrumbs: Array<{ name: string; url: string }>
  canonicalUrl: string
  description?: string
  jsonLd: ReturnType<typeof docsJsonLd> | null
  ogImage?: string
  pageTree: Awaited<ReturnType<typeof source.serializePageTree>>
  path: string
  selfHost: boolean
  title?: string
}

export const Route = createFileRoute('/docs/$')({
  // The Fumadocs client loader and renderer depend on each other. Keeping them
  // in one route-only chunk prevents the docs UI from leaking into every
  // public page through the router's shared loader/reference bundle.
  codeSplitGroupings: [['loader', 'component']],
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
          type: 'website',
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

    // Extensionless on purpose: a `.webp` suffix is intercepted by the static
    // asset handler (404) before reaching this dynamic route; the route serves
    // image/webp regardless of extension.
    const ogPath =
      page.slugs.length > 0
        ? `/og/docs/${page.slugs.join('/')}`
        : '/og/docs/index'

    const canonicalUrl = `${getAppUrl()}${page.url}`
    const breadcrumbs = [
      { name: 'Keenpix', url: getAppUrl() },
      { name: 'Docs', url: `${getAppUrl()}/docs` },
      { name: page.data.title, url: canonicalUrl },
    ]
    const selfHost = !isCloud()

    return {
      breadcrumbs,
      canonicalUrl,
      selfHost,
      path: page.path,
      title: page.data.title,
      description: page.data.description,
      ogImage: `${getAppUrl()}${ogPath}`,
      pageTree: await source.serializePageTree(source.getPageTree()),
      // Built here so the JSON-LD shares one source of truth with the page's
      // breadcrumbs/canonical; rendered as an SSR <script> in Page().
      jsonLd: selfHost
        ? null
        : docsJsonLd({
            dateModified: page.data.updated,
            description: page.data.description,
            path: breadcrumbs,
            title: page.data.title,
            url: canonicalUrl,
          }),
    }
  })

const clientLoader = browserCollections.docs.createClientLoader({
  component({ toc, frontmatter, default: MDX }) {
    return (
      <DocsPage slots={{ container: DocsMainContainer }} toc={toc}>
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
  const loaderData = Route.useLoaderData() as DocsLoaderData
  const { path, pageTree } = useFumadocsLoader(loaderData)

  return (
    <RootProvider theme={{ enabled: false }}>
      {loaderData.jsonLd ? <JsonLd data={loaderData.jsonLd} /> : null}
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
