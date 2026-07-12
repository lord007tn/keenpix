import { createFileRoute } from '@tanstack/react-router'
import { getAppUrl, isCloud } from '@/server/deployment'
import { SUPPORT_EMAIL } from '@/shared/authors'

export const Route = createFileRoute('/.well-known/security.txt')({
  server: {
    handlers: {
      GET: () => {
        if (!isCloud()) {
          return new Response('Not found', { status: 404 })
        }

        const canonicalUrl = `${getAppUrl()}/.well-known/security.txt`
        const body = [
          `Contact: mailto:${SUPPORT_EMAIL}`,
          'Expires: 2027-07-12T23:59:59Z',
          `Canonical: ${canonicalUrl}`,
          `Policy: ${getAppUrl()}/security`,
          'Preferred-Languages: en',
          '',
        ].join('\n')

        return new Response(body, {
          headers: {
            'cache-control': 'public, max-age=3600',
            'content-type': 'text/plain; charset=utf-8',
          },
        })
      },
    },
  },
})
