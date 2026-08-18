import { describe, expect, it, vi } from 'vitest'

const { json, post } = vi.hoisted(() => ({
  json: vi.fn(),
  post: vi.fn(),
}))

vi.mock('got', () => ({ default: { post } }))

post.mockReturnValue({ json })

const { fetchProjectEdgeHourly } = await import('./project-edge-analytics')

describe('fetchProjectEdgeHourly', () => {
  it('uses Analytics Engine-supported SQL and the account token', async () => {
    json.mockResolvedValue({ data: [] })

    await fetchProjectEdgeHourly(
      {
        accountApiToken: 'account-secret',
        accountId: 'account',
        apiToken: 'zone-secret',
        enabled: true,
        zoneId: 'zone',
      },
      {
        since: new Date('2026-08-04T00:00:00.000Z'),
        until: new Date('2026-08-04T03:00:00.000Z'),
      },
    )

    const request = post.mock.calls.at(-1)
    expect(request?.[1]?.headers.authorization).toBe('Bearer account-secret')
    expect(request?.[1]?.body).toContain('blob4 AS status')
    expect(request?.[1]?.body).toContain(
      "timestamp >= toDateTime('2026-08-04 00:00:00')",
    )
    expect(request?.[1]?.body).toContain(
      "timestamp < toDateTime('2026-08-04 03:00:00')",
    )
    expect(request?.[1]?.body).not.toContain('toInt32')
  })
})
