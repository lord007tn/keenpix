import { createFileRoute } from '@tanstack/react-router'
import { IMAGE_CDN_PRICING } from '@/shared/image-cdn-pricing'

export const Route = createFileRoute('/image-cdn-pricing.json')({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(IMAGE_CDN_PRICING, null, 2), {
          headers: {
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
            'Content-Type': 'application/json; charset=utf-8',
          },
        }),
    },
  },
})
