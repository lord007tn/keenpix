import { createFileRoute } from '@tanstack/react-router'
import { llms } from 'fumadocs-core/source'
import { getAppUrl, isSelfHosted } from '@/server/deployment'
import { source } from '@/shared/docs-source'

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
      return 'Hosted documentation for the Keenpix self-hosted image optimization service.'
    }

    return typeof node.description === 'string' ? node.description : ''
  },
})

export const Route = createFileRoute('/{$llmFile}.txt')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (isSelfHosted()) {
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

  return `${generator.index()}

## Full Markdown

- [Full documentation](${baseUrl}/llms-full.txt): all public Keenpix docs in one Markdown file.
`
}

async function llmsFull() {
  const baseUrl = getAppUrl()
  const sections = await Promise.all(
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

  return [
    '# Keenpix documentation',
    '',
    'Complete hosted documentation for Keenpix, a self-hosted image optimization service.',
    '',
    ...sections,
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
