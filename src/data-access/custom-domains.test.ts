import { beforeEach, describe, expect, it, vi } from 'vitest'

const transaction = vi.fn()

vi.mock('@/db', () => ({
  prisma: { $transaction: transaction },
}))

const { createCustomDomainRecord } = await import('./custom-domains')

describe('createCustomDomainRecord', () => {
  beforeEach(() => {
    transaction.mockReset()
  })

  it('takes a deserializable advisory lock before enforcing the allowance', async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ locked: 1 }])
    const count = vi.fn().mockResolvedValue(0)
    const create = vi.fn().mockResolvedValue({ id: 'domain-id' })
    transaction.mockImplementation((callback) =>
      callback({
        $queryRaw: queryRaw,
        customDomain: { count, create },
      }),
    )

    await expect(
      createCustomDomainRecord({
        dnsStatus: 'pending',
        hostname: 'images.example.com',
        lastError: null,
        limit: 1,
        orgId: 'org-id',
        projectId: 'project-id',
        providerData: {},
        providerHostnameId: 'provider-id',
        sslStatus: 'pending',
        verifiedAt: null,
      }),
    ).resolves.toEqual({ id: 'domain-id' })

    expect(queryRaw).toHaveBeenCalledOnce()
    expect(count).toHaveBeenCalledWith({
      where: { project: { orgId: 'org-id' } },
    })
    expect(create).toHaveBeenCalledOnce()
    expect(queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      count.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    )
  })
})
