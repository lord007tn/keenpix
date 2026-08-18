export interface KeenpixClientConfig {
  apiKey: string
  baseUrl: string
  fetch?: typeof globalThis.fetch
}

export type KeenpixWatermarkPosition =
  | 'center'
  | 'east'
  | 'north'
  | 'northeast'
  | 'northwest'
  | 'south'
  | 'southeast'
  | 'southwest'
  | 'west'

export interface KeenpixProject {
  allowedOrigins: string[]
  autoFormat: boolean
  defaultDpr: number
  defaultFit: string
  defaultQuality: number
  id: string
  maxWidth?: number | null
  name: string
  origin: string
  stripMetadata: boolean
  watermarkEnabled: boolean
  watermarkMargin: number
  watermarkOpacity: number
  watermarkPosition: KeenpixWatermarkPosition
  watermarkScale: number
  watermarkUrl: string | null
}

export interface KeenpixProjectConfiguration {
  allowedOrigins: string[]
  defaults: {
    autoFormat: boolean
    defaultQuality: number
    stripMetadata: boolean
    watermarkEnabled: boolean
  }
  imageBaseUrl: string
  origin: string
  projectId: string
  projectName: string
  supportedParameters: string[]
  transformUrlTemplate: string
  watermark: {
    enabled: boolean
    margin: number
    opacity: number
    position: KeenpixWatermarkPosition
    scale: number
    url: string | null
  }
}

export interface KeenpixPrewarmInput {
  dpr?: number
  fit?: 'contain' | 'cover' | 'fill' | 'inside'
  formats?: Array<'auto' | 'avif' | 'jpeg' | 'png' | 'webp'>
  quality?: number
  sources: string[]
  widths?: number[]
}

const TRAILING_SLASHES = /\/+$/

export class KeenpixApiError extends Error {
  readonly body: unknown
  readonly status: number

  constructor(status: number, body: unknown) {
    super(
      typeof body === 'object' && body && 'error' in body
        ? String(body.error)
        : `Keenpix API request failed with ${status}`,
    )
    this.name = 'KeenpixApiError'
    this.status = status
    this.body = body
  }
}

export function createKeenpixClient(config: KeenpixClientConfig) {
  const baseUrl = config.baseUrl.replace(TRAILING_SLASHES, '')
  const requestFetch = config.fetch ?? globalThis.fetch

  async function request<T>(path: string, init?: RequestInit) {
    const response = await requestFetch(`${baseUrl}/api/sdk/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      throw new KeenpixApiError(response.status, body)
    }
    return body as T
  }

  return {
    async listProjects() {
      return (await request<{ projects: KeenpixProject[] }>('/projects'))
        .projects
    },
    async createProject(input: {
      allowedOrigins?: string[]
      name: string
      origin: string
    }) {
      return (
        await request<{ project: KeenpixProject }>('/projects', {
          method: 'POST',
          body: JSON.stringify(input),
        })
      ).project
    },
    async getProject(projectId: string) {
      return (
        await request<{ project: KeenpixProject }>(`/projects/${projectId}`)
      ).project
    },
    async getConfiguration(projectId: string) {
      return (
        await request<{ configuration: KeenpixProjectConfiguration }>(
          `/projects/${projectId}/configuration`,
        )
      ).configuration
    },
    async updateProject(
      projectId: string,
      input: Partial<
        Pick<
          KeenpixProject,
          | 'autoFormat'
          | 'defaultDpr'
          | 'defaultFit'
          | 'defaultQuality'
          | 'maxWidth'
          | 'stripMetadata'
          | 'watermarkEnabled'
          | 'watermarkMargin'
          | 'watermarkOpacity'
          | 'watermarkPosition'
          | 'watermarkScale'
          | 'watermarkUrl'
        >
      >,
    ) {
      return (
        await request<{ project: KeenpixProject }>(
          `/projects/${projectId}/settings`,
          { method: 'PATCH', body: JSON.stringify(input) },
        )
      ).project
    },
    async addDomain(projectId: string, host: string) {
      return (
        await request<{ project: KeenpixProject }>(
          `/projects/${projectId}/domains`,
          { method: 'POST', body: JSON.stringify({ host }) },
        )
      ).project
    },
    async removeDomain(projectId: string, host: string) {
      return (
        await request<{ project: KeenpixProject }>(
          `/projects/${projectId}/domains?host=${encodeURIComponent(host)}`,
          { method: 'DELETE' },
        )
      ).project
    },
    async prewarm(projectId: string, input: KeenpixPrewarmInput) {
      return (
        await request<{
          prewarm: {
            accepted: boolean
            sourceCount: number
            variantCount: number
          }
        }>(`/projects/${projectId}/prewarm`, {
          method: 'POST',
          body: JSON.stringify(input),
        })
      ).prewarm
    },
  }
}
