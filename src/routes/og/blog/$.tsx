import ImageResponse from '@takumi-rs/image-response'
import { createFileRoute } from '@tanstack/react-router'
import { blogSource } from '@/shared/blog-source'

const IMAGE_EXTENSION = /\.(png|webp|jpg|jpeg)$/i

const LOGO_PIXELS = [
  { color: '#22d3ee', key: 'top-left' },
  { color: '#34d399', key: 'top-center' },
  { color: '#f8fafc', key: 'top-right' },
  { color: '#34d399', key: 'middle-left' },
  { color: '#f8fafc', key: 'middle-center' },
  { color: '#22d3ee', key: 'middle-right' },
  { color: '#34d399', key: 'bottom-left' },
]

// Per-post social card so shared "Keenpix vs X" links render a title-bearing
// image instead of the one generic brand card. Mirrors /og/docs; extensionless on
// purpose (the static asset handler intercepts real image suffixes first).
export const Route = createFileRoute('/og/blog/$')({
  server: {
    handlers: {
      GET: ({ params }) => {
        const requested = params._splat ?? 'index.webp'
        const path = requested.replace(IMAGE_EXTENSION, '')
        const slugs = path.split('/').filter(Boolean)
        const page = blogSource.getPage(slugs)

        if (!page) {
          return new Response('Not found', { status: 404 })
        }

        return new ImageResponse(
          <div
            style={{
              alignItems: 'center',
              background: '#07111f',
              color: '#f8fafc',
              display: 'flex',
              height: '100%',
              justifyContent: 'center',
              padding: 72,
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 36,
                width: '100%',
              }}
            >
              <div
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  gap: 18,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 7,
                    height: 72,
                    width: 72,
                  }}
                >
                  {LOGO_PIXELS.map(({ color, key }) => (
                    <div
                      key={key}
                      style={{
                        background: color,
                        borderRadius: 7,
                        height: 18,
                        width: 18,
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ fontSize: 32, fontWeight: 700 }}>keenpix</div>
                  <div style={{ color: '#67e8f9', fontSize: 22 }}>
                    {page.data.competitor
                      ? `Keenpix vs ${page.data.competitor}`
                      : 'Keenpix Blog'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 68,
                    fontWeight: 760,
                    letterSpacing: 0,
                    lineHeight: 1.05,
                  }}
                >
                  {page.data.title}
                </div>
                {page.data.description ? (
                  <div
                    style={{
                      color: '#cbd5e1',
                      fontSize: 30,
                      lineHeight: 1.25,
                      maxWidth: 920,
                    }}
                  >
                    {page.data.description.length > 120
                      ? `${page.data.description.slice(0, 119).trimEnd()}…`
                      : page.data.description}
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          {
            // PNG, not WebP: several link unfurlers (LinkedIn, some Slack/Discord
            // scrapers) reject WebP og:image and show no preview.
            format: 'png',
            headers: {
              'cache-control': 'public, immutable, max-age=31536000',
            },
            height: 630,
            width: 1200,
          },
        )
      },
    },
  },
})
