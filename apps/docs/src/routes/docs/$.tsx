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
import { Suspense } from 'react'
import { z } from 'zod'
import { getMDXComponents } from '@/components/mdx'
import { source } from '@/docs-source'

const slugsSchema = z.array(z.string().min(1).max(200)).max(20)

interface DocsData {
  description?: string
  pageTree: Awaited<ReturnType<typeof source.serializePageTree>>
  path: string
  title: string
}

const loadPage = createServerFn({ method: 'GET' })
  .inputValidator(slugsSchema)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs)
    if (!page) {
      throw notFound()
    }
    return {
      description: page.data.description,
      pageTree: await source.serializePageTree(source.getPageTree()),
      path: page.path,
      title: page.data.title,
    }
  })

const content = browserCollections.docs.createClientLoader({
  component({ default: MDX, frontmatter, toc }) {
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

export const Route = createFileRoute('/docs/$')({
  component: Docs,
  head: ({ loaderData }: { loaderData?: DocsData }) => ({
    meta: [
      { title: `${loaderData?.title ?? 'Keenpix'} - Keenpix docs` },
      {
        content: loaderData?.description ?? 'Keenpix documentation',
        name: 'description',
      },
    ],
  }),
  loader: async ({ params }) => {
    const data = (await loadPage({
      data: params._splat?.split('/').filter(Boolean) ?? [],
    })) as DocsData
    await content.preload(data.path)
    return data
  },
})

function Docs() {
  const data = Route.useLoaderData() as DocsData
  const { pageTree, path } = useFumadocsLoader(data)
  return (
    <DocsLayout
      links={[
        { text: 'Dashboard', url: 'https://keenpix.com/app' },
        { text: 'GitHub', url: 'https://github.com/lord007tn/keenpix' },
      ]}
      nav={{ title: 'Keenpix docs' }}
      tree={pageTree}
    >
      <Suspense>{content.useContent(path)}</Suspense>
    </DocsLayout>
  )
}
