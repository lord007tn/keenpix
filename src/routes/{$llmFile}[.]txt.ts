import { createFileRoute } from '@tanstack/react-router'
import { llms } from 'fumadocs-core/source'
import { getAppUrl, isCloud } from '@/server/deployment'
import { listBlogPosts } from '@/shared/blog-source'
import { source } from '@/shared/docs-source'
import { MARKETING_FAQ } from '@/shared/marketing-faq'

// fumadocs attaches getText() to each page's data at runtime to expose the
// processed Markdown body (enabled via includeProcessedMarkdown in
// source.config.ts). The loader's Data type doesn't surface it, so read it
// through a structural check.
async function processedMarkdown(data: unknown) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'getText' in data &&
    typeof data.getText === 'function'
  ) {
    try {
      return String(await data.getText('processed')).trim()
    } catch {
      return ''
    }
  }
  return ''
}

const generator = llms(source, {
  renderName: (node) => {
    if (node.type === 'root') {
      return 'Keenpix documentation'
    }

    return typeof node.name === 'string' ? node.name : ''
  },
  renderDescription: (node) => {
    if (node.type === 'root') {
      return 'Documentation for Keenpix — an image optimization CDN available as managed cloud or a self-hosted open-source engine.'
    }

    return typeof node.description === 'string' ? node.description : ''
  },
})

export const Route = createFileRoute('/{$llmFile}.txt')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!isCloud()) {
          return new Response('Not found', { status: 404 })
        }

        if (params.llmFile === 'llms') {
          return textResponse(llmsIndex())
        }

        if (params.llmFile === 'llms-full') {
          return textResponse(await llmsFull())
        }

        return new Response('Not found', { status: 404 })
      },
    },
  },
})

function llmsIndex() {
  const baseUrl = getAppUrl()
  const blogList = listBlogPosts()
    .map(
      (post) => `- [${post.title}](${baseUrl}${post.url}): ${post.description}`,
    )
    .join('\n')

  return `${generator.index()}

## Blog

${blogList}

## Full Markdown

- [Full documentation](${baseUrl}/llms-full.txt): all public Keenpix docs, blog posts, and FAQ in one Markdown file.
`
}

async function llmsFull() {
  const baseUrl = getAppUrl()
  const docsSections = await Promise.all(
    source.getPages().map(async (page) => {
      const body = await processedMarkdown(page.data)
      const fallback = [
        page.data.description,
        `Canonical URL: ${baseUrl}${page.url}`,
      ]
        .filter(Boolean)
        .join('\n\n')

      return [
        `## ${page.data.title ?? page.url}`,
        '',
        `Source: ${baseUrl}${page.url}`,
        '',
        body || fallback,
        '',
      ].join('\n')
    }),
  )

  // Blog posts don't opt into includeProcessedMarkdown, so summarize each by its
  // description + canonical source rather than the full body.
  const blogSections = listBlogPosts().map((post) =>
    [
      `## ${post.title}`,
      '',
      `Source: ${baseUrl}${post.url}`,
      '',
      post.description,
      '',
    ].join('\n'),
  )

  const faqSections = MARKETING_FAQ.map((item) =>
    [`## ${item.question}`, '', item.answer, ''].join('\n'),
  )

  return [
    '# Keenpix documentation',
    '',
    'Complete documentation for Keenpix, an image optimization CDN available as managed cloud or a self-hosted open-source engine.',
    '',
    ...docsSections,
    '# Keenpix blog',
    '',
    'Guides and honest comparisons (Cloudinary, imgix, ImageKit) from the Keenpix team.',
    '',
    ...blogSections,
    '# Frequently asked questions',
    '',
    ...faqSections,
  ].join('\n')
}

function textResponse(body: string) {
  return new Response(body, {
    headers: {
      'cache-control': 'public, max-age=3600',
      'content-type': 'text/plain; charset=utf-8',
    },
  })
}
