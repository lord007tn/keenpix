import { afterEach, describe, expect, it, vi } from 'vitest'

const { json, post } = vi.hoisted(() => ({
  json: vi.fn(),
  post: vi.fn(),
}))

vi.mock('got', () => ({ default: { post } }))

post.mockReturnValue({ json })

const { fetchEdgeAdaptiveHourly, verifyCloudflareAccess } = await import(
  './analytics'
)

const settings = {
  apiToken: 'secret',
  enabled: true,
  zoneId: 'zone',
}

afterEach(() => {
  vi.useRealTimers()
})

describe('verifyCloudflareAccess', () => {
  it.each([
    { host: undefined, hostFilter: '' },
    {
      host: 'images.example.com',
      hostFilter: ', clientRequestHTTPHost: $host',
    },
  ])('filters $host end-user analytics to eyeball requests', async (testCase) => {
    json.mockResolvedValue({
      data: { viewer: { zones: [{ httpRequestsAdaptiveGroups: [] }] } },
    })

    await verifyCloudflareAccess({ ...settings, host: testCase.host })

    const request = post.mock.calls.at(-1)?.[1]
    expect(request?.json.query).toContain(
      `requestSource: "eyeball", clientRequestPath_like: $path${testCase.hostFilter}`,
    )
  })

  it('rejects a token that cannot see the configured zone', async () => {
    json.mockResolvedValue({ data: { viewer: { zones: [] } } })

    await expect(verifyCloudflareAccess(settings)).rejects.toThrow(
      'cannot access the configured Cloudflare zone',
    )
  })

  it('rejects GraphQL permission errors', async () => {
    json.mockResolvedValue({ errors: [{ message: 'Analytics Read required' }] })

    await expect(verifyCloudflareAccess(settings)).rejects.toThrow(
      'Analytics Read required',
    )
  })
})

describe('fetchEdgeAdaptiveHourly', () => {
  it('keeps the provider query below the strict one-day limit', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-28T19:45:00.123Z'))
    json.mockResolvedValue({
      data: {
        viewer: {
          zones: [{ httpRequestsAdaptiveGroups: [] }],
        },
      },
    })

    await fetchEdgeAdaptiveHourly(settings)

    const request = post.mock.calls.at(-1)?.[1]
    expect(request?.json.variables).toMatchObject({
      since: '2026-07-27T19:45:01.123Z',
      until: '2026-07-28T19:45:00.123Z',
    })
  })
})
