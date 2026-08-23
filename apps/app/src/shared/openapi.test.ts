import { describe, expect, it } from 'vitest'
import { OPENAPI_DOCUMENT } from './openapi'

const HTTP_METHODS = new Set([
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
  'trace',
])

describe('Keenpix OpenAPI document', () => {
  it('publishes OpenAPI 3.1 and the truthful API-key security boundary', () => {
    expect(OPENAPI_DOCUMENT.openapi).toBe('3.1.1')
    expect(OPENAPI_DOCUMENT.info.title).toBe('Keenpix API')
    expect(OPENAPI_DOCUMENT.info.contact).toEqual(
      expect.objectContaining({
        email: 'hi@raedbahri.com',
        'x-whatsapp': 'https://wa.me/21626765990',
      }),
    )
    expect(OPENAPI_DOCUMENT.components.securitySchemes).toEqual(
      expect.objectContaining({
        bearerApiKey: expect.objectContaining({ scheme: 'bearer' }),
        keenpixApiKey: expect.objectContaining({
          in: 'header',
          name: 'X-Keenpix-Api-Key',
        }),
      }),
    )
    expect(JSON.stringify(OPENAPI_DOCUMENT)).not.toContain('oauth2')
    expect(OPENAPI_DOCUMENT.info.description).toContain(
      'does not operate an OAuth authorization server',
    )
    expect(OPENAPI_DOCUMENT.info.description).toContain(
      'a separate API sandbox',
    )
    expect(OPENAPI_DOCUMENT.info.description).toContain('an official CLI')
  })

  it('gives every operation a unique id, description, and typed response', () => {
    const operations = Object.values(OPENAPI_DOCUMENT.paths).flatMap((path) =>
      Object.entries(path)
        .filter(([method]) => HTTP_METHODS.has(method))
        .map(([, operation]) => operation),
    )
    const operationIds = operations.map((operation) => operation.operationId)

    expect(new Set(operationIds).size).toBe(operationIds.length)
    expect(operationIds).toEqual(
      expect.arrayContaining([
        'getServiceHealth',
        'listProjects',
        'getProjectConfiguration',
        'prewarmProjectImages',
      ]),
    )
    for (const operation of operations) {
      expect(operation.description.length).toBeGreaterThan(20)
      expect(Object.keys(operation.responses).length).toBeGreaterThan(0)
    }
  })

  it('types every path and query parameter', () => {
    const serialized = JSON.stringify(OPENAPI_DOCUMENT)
    expect(serialized).toContain('projectId')
    expect(serialized).toContain('resolution_hint')

    for (const path of Object.values(OPENAPI_DOCUMENT.paths)) {
      for (const [method, operation] of Object.entries(path)) {
        if (!(HTTP_METHODS.has(method) && 'parameters' in operation)) {
          continue
        }
        for (const parameter of operation.parameters) {
          expect(parameter.schema.type).toBeTruthy()
          expect(parameter.description).toBeTruthy()
        }
      }
    }
  })

  it('matches the accepted project input fields', () => {
    const { CreateProjectInput, Project, ProjectSettingsInput } =
      OPENAPI_DOCUMENT.components.schemas

    expect(CreateProjectInput.required).toEqual(['name', 'origin'])
    expect(CreateProjectInput.properties).not.toHaveProperty('env')
    expect(Project.properties).not.toHaveProperty('env')
    expect(Project.required).toEqual(
      expect.arrayContaining([
        'orgId',
        'requireSignedUrls',
        'watermarkPosition',
      ]),
    )
    expect(Project.properties.createdAt).not.toHaveProperty('format')
    expect(ProjectSettingsInput.properties.defaultFit.enum).toContain('outside')
    expect(ProjectSettingsInput.properties.maxWidth).toEqual(
      expect.objectContaining({ maximum: 10_000, minimum: 0 }),
    )
    expect(ProjectSettingsInput.properties).toEqual(
      expect.objectContaining({
        watermarkMargin: expect.any(Object),
        watermarkOpacity: expect.any(Object),
        watermarkPosition: expect.any(Object),
        watermarkScale: expect.any(Object),
      }),
    )
  })
})
