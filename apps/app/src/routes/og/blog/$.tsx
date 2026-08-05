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

        let visualKind = 'pipeline'
        if (page.data.competitor) {
          visualKind = 'comparison'
        } else if (page.data.tags.includes('responsive-images')) {
          visualKind = 'responsive'
        } else if (page.data.tags.includes('pricing')) {
          visualKind = 'pricing'
        } else if (page.data.tags.includes('self-hosting')) {
          visualKind = 'deployment'
        }
        const accent =
          visualKind === 'pricing' || visualKind === 'deployment'
            ? '#34e58d'
            : '#21c8f6'

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
                gap: 30,
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
                  gap: 44,
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    maxWidth: 720,
                  }}
                >
                  <div
                    style={{
                      fontSize: 56,
                      fontWeight: 760,
                      letterSpacing: 0,
                      lineHeight: 1.04,
                    }}
                  >
                    {page.data.title}
                  </div>
                  {page.data.description ? (
                    <div
                      style={{
                        color: '#cbd5e1',
                        fontSize: 26,
                        lineHeight: 1.25,
                        maxWidth: 700,
                      }}
                    >
                      {page.data.description.length > 105
                        ? `${page.data.description.slice(0, 104).trimEnd()}…`
                        : page.data.description}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    alignItems: 'center',
                    alignSelf: 'stretch',
                    background: '#0d2034',
                    border: '2px solid #183651',
                    borderRadius: 28,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    justifyContent: 'center',
                    minWidth: 300,
                    padding: 30,
                  }}
                >
                  <div
                    style={{
                      color: accent,
                      fontSize: 18,
                      fontWeight: 700,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                    }}
                  >
                    {visualKind}
                  </div>
                  {visualKind === 'responsive' ? (
                    <div
                      style={{
                        alignItems: 'flex-end',
                        display: 'flex',
                        gap: 12,
                      }}
                    >
                      {[74, 108, 148].map((height, index) => (
                        <div
                          key={height}
                          style={{
                            background: index === 2 ? accent : `${accent}55`,
                            borderRadius: 10,
                            height,
                            width: 58 + index * 13,
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                  {visualKind === 'pricing' ? (
                    <div
                      style={{
                        alignItems: 'flex-end',
                        display: 'flex',
                        gap: 16,
                        height: 160,
                      }}
                    >
                      {[68, 112, 150].map((height) => (
                        <div
                          key={height}
                          style={{
                            background: accent,
                            borderRadius: 999,
                            height,
                            opacity: height / 170,
                            width: 42,
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                  {visualKind === 'comparison' ? (
                    <div style={{ display: 'flex', gap: 24 }}>
                      {['#21c8f6', '#34e58d'].map((color) => (
                        <div
                          key={color}
                          style={{
                            alignItems: 'center',
                            border: `2px solid ${color}`,
                            borderRadius: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            height: 150,
                            justifyContent: 'center',
                            width: 104,
                          }}
                        >
                          {[36, 58, 44].map((width) => (
                            <div
                              key={width}
                              style={{
                                background: color,
                                borderRadius: 999,
                                height: 10,
                                opacity: 0.85,
                                width,
                              }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {visualKind === 'deployment' ? (
                    <div
                      style={{
                        alignItems: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 18,
                      }}
                    >
                      <div
                        style={{
                          background: '#f8fafc',
                          borderRadius: 12,
                          height: 56,
                          width: 56,
                        }}
                      />
                      <div style={{ display: 'flex', gap: 42 }}>
                        {['#21c8f6', '#34e58d'].map((color) => (
                          <div
                            key={color}
                            style={{
                              background: color,
                              borderRadius: 14,
                              height: 86,
                              width: 86,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {visualKind === 'pipeline' ? (
                    <div
                      style={{
                        alignItems: 'center',
                        display: 'flex',
                        gap: 12,
                      }}
                    >
                      {['#f8fafc', '#21c8f6', '#079ed4', '#34e58d'].map(
                        (color, index) => (
                          <div
                            key={color}
                            style={{
                              background: color,
                              borderRadius: 12,
                              height: 46 + index * 16,
                              width: 46 + index * 16,
                            }}
                          />
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
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
