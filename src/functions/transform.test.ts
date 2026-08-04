import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveCustomDomainProject = vi.hoisted(() => vi.fn())
const optimizeProjectImage = vi.hoisted(() => vi.fn())
const isCloud = vi.hoisted(() => vi.fn(() => true))

vi.mock('@/actions/custom-domains', () => ({ resolveCustomDomainProject }))
vi.mock('@/actions/transform', () => ({ optimizeProjectImage }))
vi.mock('@/env/server', () => ({
  env: { CLOUDFLARE_SAAS_EDGE_SECRET: 'edge-secret' },
}))
vi.mock('@/lib/cache/cache', () => ({ cacheControl: () => 'public' }))
vi.mock('@/server/deployment', () => ({
  getAppUrl: () => 'https://keenpix.com',
  isCloud,
}))

import { handleTransformRequest } from './transform'

const source = 'https://assets.example.com/photo.jpg'
const encodedSource = encodeURIComponent(source)

describe('transform request routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isCloud.mockReturnValue(true)
    optimizeProjectImage.mockResolvedValue({
      body: Buffer.from('image'),
      cached: false,
      format: 'webp',
    })
  })

  it('permanently redirects a legacy cloud URL to the project edge path', async () => {
    const response = await handleTransformRequest(
      new Request(
        `https://keenpix.com/img/${encodedSource}?project=project_123&w=800&sig=signed`,
      ),
      encodedSource,
    )

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(
      `https://cdn.keenpix.com/p/project_123/img/${encodedSource}?w=800&sig=signed`,
    )
    expect(optimizeProjectImage).not.toHaveBeenCalled()
    expect(resolveCustomDomainProject).not.toHaveBeenCalled()
  })

  it('redirects the first-party www hostname to the same canonical path', async () => {
    const response = await handleTransformRequest(
      new Request(
        `https://www.keenpix.com/img/${encodedSource}?project=project_123&w=800`,
      ),
      encodedSource,
    )

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(
      `https://cdn.keenpix.com/p/project_123/img/${encodedSource}?w=800`,
    )
  })

  it('serves a trusted first-party Worker request without redirecting', async () => {
    const response = await handleTransformRequest(
      new Request(
        `https://keenpix.com/img/${encodedSource}?project=project_123&__keenpix_edge_host=cdn.keenpix.com`,
        {
          headers: {
            'x-keenpix-custom-host': 'cdn.keenpix.com',
            'x-keenpix-edge-project': 'project_123',
            'x-keenpix-edge-secret': 'edge-secret',
          },
        },
      ),
      encodedSource,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-keenpix-edge-project')).toBe('project_123')
    expect(optimizeProjectImage).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project_123' }),
    )
  })

  it('pins a direct customer hostname to its verified project', async () => {
    resolveCustomDomainProject.mockResolvedValue('customer_project')

    const response = await handleTransformRequest(
      new Request(`https://images.customer.com/img/${encodedSource}?w=400`),
      encodedSource,
    )

    expect(response.status).toBe(200)
    expect(resolveCustomDomainProject).toHaveBeenCalledWith(
      'images.customer.com',
    )
    expect(optimizeProjectImage).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'customer_project' }),
    )
  })

  it('rejects a conflicting project on a verified customer hostname', async () => {
    resolveCustomDomainProject.mockResolvedValue('customer_project')

    const response = await handleTransformRequest(
      new Request(
        `https://images.customer.com/img/${encodedSource}?project=other_project`,
      ),
      encodedSource,
    )

    expect(response.status).toBe(400)
    expect(response.headers.has('x-keenpix-edge-project')).toBe(false)
    await expect(response.text()).resolves.toBe(
      'Project does not match verified custom domain',
    )
    expect(optimizeProjectImage).not.toHaveBeenCalled()
  })

  it('pins a trusted customer-domain Worker request to its hostname', async () => {
    resolveCustomDomainProject.mockResolvedValue('customer_project')

    const response = await handleTransformRequest(
      new Request(
        `https://keenpix.com/img/${encodedSource}?project=other_project&__keenpix_edge_host=images.customer.com`,
        {
          headers: {
            'x-keenpix-custom-host': 'images.customer.com',
            'x-keenpix-edge-secret': 'edge-secret',
          },
        },
      ),
      encodedSource,
    )

    expect(response.status).toBe(400)
    expect(response.headers.get('x-keenpix-edge-project')).toBe(
      'customer_project',
    )
    expect(resolveCustomDomainProject).toHaveBeenCalledWith(
      'images.customer.com',
    )
    expect(optimizeProjectImage).not.toHaveBeenCalled()
  })

  it('serves a trusted customer-domain Worker request without a project query', async () => {
    resolveCustomDomainProject.mockResolvedValue('customer_project')

    const response = await handleTransformRequest(
      new Request(
        `https://keenpix.com/img/${encodedSource}?w=400&__keenpix_edge_host=images.customer.com`,
        {
          headers: {
            'x-keenpix-custom-host': 'images.customer.com',
            'x-keenpix-edge-secret': 'edge-secret',
          },
        },
      ),
      encodedSource,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-keenpix-edge-project')).toBe(
      'customer_project',
    )
    expect(optimizeProjectImage).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'customer_project' }),
    )
  })

  it('keeps the query-based route active for self-hosted deployments', async () => {
    isCloud.mockReturnValue(false)

    const response = await handleTransformRequest(
      new Request(
        `https://images.selfhosted.test/img/${encodedSource}?project=project_123`,
      ),
      encodedSource,
    )

    expect(response.status).toBe(200)
    expect(optimizeProjectImage).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project_123' }),
    )
  })
})
