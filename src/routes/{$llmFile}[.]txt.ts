import { createFileRoute } from '@tanstack/react-router'
import { llms } from 'fumadocs-core/source'
import { getAppUrl, isSelfHosted } from '@/lib/deployment'
import { source } from '@/lib/source'

interface MarkdownPageData {
  _markdown?: string
  description?: string
  title?: string
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
      return 'Hosted documentation for the Keenpix self-hosted image optimization service.'
    }

    return typeof node.description === 'string' ? node.description : ''
  },
})

export const Route = createFileRoute('/{$llmFile}.txt')({
  server: {
    handlers: {
      GET: ({ params }) => {
        if (isSelfHosted()) {
          return new Response('Not found', { status: 404 })
        }

        if (params.llmFile === 'llms') {
          return textResponse(llmsIndex())
        }

        if (params.llmFile === 'llms-full') {
          return textResponse(llmsFull())
        }

        return new Response('Not found', { status: 404 })
      },
    },
  },
})

function llmsIndex() {
  const baseUrl = getAppUrl()

  return `${generator.index()}

## Full Markdown

- [Full documentation](${baseUrl}/llms-full.txt): all public Keenpix docs in one Markdown file.
`
}

function llmsFull() {
  const baseUrl = getAppUrl()

  return [
    '# Keenpix documentation',
    '',
    'Complete hosted documentation for Keenpix, a self-hosted image optimization service.',
    '',
    ...source.getPages().flatMap((page) => {
      const data = page.data as MarkdownPageData
      const markdown =
        data._markdown?.trim() ||
        [data.description, `Canonical URL: ${baseUrl}${page.url}`]
          .filter(Boolean)
          .join('\n\n')

      return [
        `## ${data.title ?? page.url}`,
        '',
        `Source: ${baseUrl}${page.url}`,
        '',
        markdown,
        '',
      ]
    }),
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
