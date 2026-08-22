import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_URL } from '@/shared/authors'

const errorResponse = (description: string) => ({
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ApiError' },
    },
  },
  description,
})

const projectIdParameter = {
  description: 'Keenpix project identifier.',
  in: 'path',
  name: 'projectId',
  required: true,
  schema: { type: 'string' },
}

const authenticatedResponses = {
  '401': { $ref: '#/components/responses/Unauthorized' },
  '402': { $ref: '#/components/responses/SubscriptionRequired' },
  '403': { $ref: '#/components/responses/Forbidden' },
  '429': { $ref: '#/components/responses/RateLimited' },
  '500': { $ref: '#/components/responses/InternalError' },
}

export const OPENAPI_DOCUMENT = {
  openapi: '3.1.1',
  jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
  info: {
    title: 'Keenpix API',
    version: '1.0.0',
    description:
      'The Keenpix JSON API exposes unauthenticated service health and an authenticated, versioned control plane for trusted backend integrations. Authentication intentionally uses project-scoped API keys. Keenpix does not operate an OAuth authorization server, a separate API sandbox, or an official CLI; integrations can call the REST API directly or use @keenpix/sdk.',
    contact: {
      name: 'Raed Bahri',
      email: SUPPORT_EMAIL,
      url: 'https://keenpix.com/developers#contact',
      'x-whatsapp': SUPPORT_WHATSAPP_URL,
    },
    license: {
      name: 'AGPL-3.0-only',
      identifier: 'AGPL-3.0-only',
    },
  },
  externalDocs: {
    description: 'Keenpix developer resources',
    url: 'https://keenpix.com/developers',
  },
  servers: [
    {
      url: '/',
      description:
        'The same origin that served this specification (managed cloud or self-hosted).',
    },
  ],
  tags: [
    {
      name: 'Service health',
      description: 'Unauthenticated operational health for the Keenpix app.',
    },
    {
      name: 'Projects',
      description: 'Authenticated project discovery and creation.',
    },
    {
      name: 'Project configuration',
      description:
        'Authenticated delivery configuration, transform defaults, source domains, and prewarming.',
    },
  ],
  security: [{ bearerApiKey: [] }, { keenpixApiKey: [] }],
  paths: {
    '/api/health': {
      get: {
        operationId: 'getServiceHealth',
        summary: 'Get service health',
        description:
          'Returns the current app and dependency health. This operation is public and does not require an API key.',
        tags: ['Service health'],
        security: [],
        responses: {
          '200': {
            description: 'The app and required dependencies are healthy.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthStatus' },
              },
            },
          },
          '503': {
            description:
              'The app is running, but one or more required dependencies are unhealthy.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthStatus' },
              },
            },
          },
        },
      },
    },
    '/api/sdk/v1/projects': {
      get: {
        operationId: 'listProjects',
        summary: 'List projects',
        description:
          'Lists projects visible to the supplied API key. Managed-cloud keys are project-scoped and return only their assigned project.',
        tags: ['Projects'],
        responses: {
          '200': {
            description: 'Projects visible to the API key.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['projects'],
                  properties: {
                    projects: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Project' },
                    },
                  },
                },
              },
            },
          },
          ...authenticatedResponses,
        },
      },
      post: {
        operationId: 'createProject',
        summary: 'Create a project',
        description:
          'Creates a project with an all-project write key. Managed-cloud keys are project-scoped, so this operation is intended for self-hosted installations.',
        tags: ['Projects'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProjectInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Project created.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['project'],
                  properties: {
                    project: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          ...authenticatedResponses,
        },
      },
    },
    '/api/sdk/v1/projects/{projectId}': {
      get: {
        operationId: 'getProject',
        summary: 'Get a project',
        description:
          'Returns one project when the API key is authorized for that project.',
        tags: ['Projects'],
        parameters: [projectIdParameter],
        responses: {
          '200': {
            description: 'Requested project.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['project'],
                  properties: {
                    project: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          ...authenticatedResponses,
        },
      },
    },
    '/api/sdk/v1/projects/{projectId}/configuration': {
      get: {
        operationId: 'getProjectConfiguration',
        summary: 'Get project delivery configuration',
        description:
          'Returns integration-safe delivery URLs, transform defaults, the source allowlist, and supported transform parameters.',
        tags: ['Project configuration'],
        parameters: [projectIdParameter],
        responses: {
          '200': {
            description: 'Integration-safe project configuration.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['configuration'],
                  properties: {
                    configuration: {
                      $ref: '#/components/schemas/ProjectConfiguration',
                    },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          ...authenticatedResponses,
        },
      },
    },
    '/api/sdk/v1/projects/{projectId}/settings': {
      patch: {
        operationId: 'updateProjectSettings',
        summary: 'Update project transform settings',
        description:
          'Updates one or more transform defaults for an authorized project.',
        tags: ['Project configuration'],
        parameters: [projectIdParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProjectSettingsInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated project.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['project'],
                  properties: {
                    project: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          ...authenticatedResponses,
        },
      },
    },
    '/api/sdk/v1/projects/{projectId}/prewarm': {
      post: {
        operationId: 'prewarmProjectImages',
        summary: 'Queue image prewarming',
        description:
          'Queues bounded source, width, and format combinations for asynchronous cache prewarming. Source URLs still pass project allowlist and SSRF validation.',
        tags: ['Project configuration'],
        parameters: [projectIdParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PrewarmInput' },
            },
          },
        },
        responses: {
          '202': {
            description: 'Prewarm variants accepted for asynchronous work.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prewarm'],
                  properties: {
                    prewarm: {
                      type: 'object',
                      required: ['accepted', 'sourceCount', 'variantCount'],
                      properties: {
                        accepted: { type: 'boolean', const: true },
                        sourceCount: { type: 'integer', minimum: 1 },
                        variantCount: { type: 'integer', minimum: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          ...authenticatedResponses,
        },
      },
    },
    '/api/sdk/v1/projects/{projectId}/domains': {
      post: {
        operationId: 'addProjectDomain',
        summary: 'Add an allowed source host',
        description:
          'Adds a normalized public hostname to the project source allowlist.',
        tags: ['Project configuration'],
        parameters: [projectIdParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DomainInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Project with the updated source allowlist.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['project'],
                  properties: {
                    project: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          ...authenticatedResponses,
        },
      },
      delete: {
        operationId: 'removeProjectDomain',
        summary: 'Remove an allowed source host',
        description:
          'Removes a hostname from the project source allowlist. Supply the host query parameter or a JSON DomainInput body.',
        tags: ['Project configuration'],
        parameters: [
          projectIdParameter,
          {
            description: 'Hostname to remove from the source allowlist.',
            in: 'query',
            name: 'host',
            required: false,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DomainInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Project with the updated source allowlist.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['project'],
                  properties: {
                    project: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          ...authenticatedResponses,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerApiKey: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Keenpix API key',
        description:
          'Project-scoped API key sent as Authorization: Bearer <key>.',
      },
      keenpixApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Keenpix-Api-Key',
        description: 'Alternative header for the same project-scoped API key.',
      },
    },
    responses: {
      BadRequest: errorResponse(
        'The JSON body or request parameters are invalid.',
      ),
      Unauthorized: errorResponse('The API key is missing or invalid.'),
      SubscriptionRequired: errorResponse(
        'The API key is valid, but its organization does not have active product access.',
      ),
      Forbidden: errorResponse(
        'The API key cannot access the requested project or operation.',
      ),
      NotFound: errorResponse(
        'The requested project or API endpoint was not found.',
      ),
      RateLimited: errorResponse('The API-key rate limit was exceeded.'),
      InternalError: errorResponse(
        'The SDK API could not complete the request.',
      ),
    },
    schemas: {
      ApiError: {
        type: 'object',
        additionalProperties: false,
        required: ['error', 'code', 'message', 'resolution_hint'],
        properties: {
          error: {
            type: 'string',
            description:
              'Backward-compatible human-readable error field used by existing SDK versions.',
          },
          code: {
            type: 'string',
            description: 'Stable machine-readable error code.',
          },
          message: {
            type: 'string',
            description: 'Human-readable explanation of the error.',
          },
          resolution_hint: {
            type: 'string',
            description: 'A safe next step that can resolve the error.',
          },
        },
      },
      HealthStatus: {
        type: 'object',
        description:
          'Current app health. Dependency fields can expand without breaking clients.',
        required: ['ok'],
        properties: { ok: { type: 'boolean' } },
        additionalProperties: true,
      },
      Project: {
        type: 'object',
        description: 'Keenpix project and its image transform defaults.',
        required: [
          'id',
          'orgId',
          'name',
          'origin',
          'allowedOrigins',
          'color1',
          'color2',
          'autoFormat',
          'defaultQuality',
          'defaultDpr',
          'defaultFit',
          'maxWidth',
          'requireSignedUrls',
          'signedUrlTtlSeconds',
          'stripMetadata',
          'watermarkEnabled',
          'watermarkUrl',
          'watermarkPosition',
          'watermarkOpacity',
          'watermarkScale',
          'watermarkMargin',
          'createdAt',
        ],
        properties: {
          id: { type: 'string' },
          orgId: { type: 'string' },
          name: { type: 'string' },
          origin: { type: 'string', format: 'uri' },
          allowedOrigins: { type: 'array', items: { type: 'string' } },
          color1: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          color2: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          autoFormat: { type: 'boolean' },
          defaultQuality: { type: 'integer', minimum: 30, maximum: 100 },
          defaultDpr: { type: 'integer', minimum: 1, maximum: 3 },
          defaultFit: {
            type: 'string',
            enum: ['contain', 'cover', 'fill', 'inside', 'outside'],
          },
          maxWidth: { type: ['integer', 'null'], minimum: 0, maximum: 10_000 },
          requireSignedUrls: { type: 'boolean' },
          signedUrlTtlSeconds: {
            type: ['integer', 'null'],
            minimum: 60,
            maximum: 2_592_000,
          },
          stripMetadata: { type: 'boolean' },
          watermarkEnabled: { type: 'boolean' },
          watermarkUrl: { type: ['string', 'null'], format: 'uri' },
          watermarkPosition: {
            type: 'string',
            enum: [
              'center',
              'north',
              'northeast',
              'northwest',
              'south',
              'southeast',
              'southwest',
              'east',
              'west',
            ],
          },
          watermarkOpacity: { type: 'integer', minimum: 1, maximum: 100 },
          watermarkScale: { type: 'integer', minimum: 1, maximum: 100 },
          watermarkMargin: { type: 'integer', minimum: 0, maximum: 500 },
          createdAt: {
            type: 'string',
            description: 'Human-readable project creation date.',
          },
        },
        additionalProperties: false,
      },
      CreateProjectInput: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'origin'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 80 },
          origin: { type: 'string', format: 'uri' },
          allowedOrigins: { type: 'array', items: { type: 'string' } },
        },
      },
      ProjectConfiguration: {
        type: 'object',
        additionalProperties: false,
        required: [
          'projectId',
          'projectName',
          'origin',
          'allowedOrigins',
          'imageBaseUrl',
          'transformUrlTemplate',
          'defaults',
          'watermark',
          'supportedParameters',
        ],
        properties: {
          projectId: { type: 'string' },
          projectName: { type: 'string' },
          origin: { type: 'string', format: 'uri' },
          allowedOrigins: { type: 'array', items: { type: 'string' } },
          imageBaseUrl: { type: 'string', format: 'uri' },
          transformUrlTemplate: { type: 'string' },
          defaults: {
            type: 'object',
            additionalProperties: false,
            required: [
              'autoFormat',
              'defaultQuality',
              'stripMetadata',
              'watermarkEnabled',
            ],
            properties: {
              autoFormat: { type: 'boolean' },
              defaultQuality: { type: 'integer' },
              stripMetadata: { type: 'boolean' },
              watermarkEnabled: { type: 'boolean' },
            },
          },
          watermark: {
            type: 'object',
            additionalProperties: false,
            required: [
              'enabled',
              'margin',
              'opacity',
              'position',
              'scale',
              'url',
            ],
            properties: {
              enabled: { type: 'boolean' },
              margin: { type: 'integer', minimum: 0, maximum: 500 },
              opacity: { type: 'integer', minimum: 1, maximum: 100 },
              position: {
                type: 'string',
                enum: [
                  'center',
                  'north',
                  'northeast',
                  'northwest',
                  'south',
                  'southeast',
                  'southwest',
                  'east',
                  'west',
                ],
              },
              scale: { type: 'integer', minimum: 1, maximum: 100 },
              url: { type: ['string', 'null'], format: 'uri' },
            },
          },
          supportedParameters: { type: 'array', items: { type: 'string' } },
        },
      },
      ProjectSettingsInput: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          autoFormat: { type: 'boolean' },
          defaultQuality: { type: 'integer', minimum: 30, maximum: 100 },
          defaultDpr: { type: 'integer', minimum: 1, maximum: 3 },
          defaultFit: {
            type: 'string',
            enum: ['contain', 'cover', 'fill', 'inside', 'outside'],
          },
          maxWidth: { type: 'integer', minimum: 0, maximum: 10_000 },
          stripMetadata: { type: 'boolean' },
          watermarkEnabled: { type: 'boolean' },
          watermarkUrl: {
            oneOf: [
              { type: 'string', const: '' },
              { type: 'string', format: 'uri' },
            ],
          },
          watermarkPosition: {
            type: 'string',
            enum: [
              'center',
              'north',
              'northeast',
              'northwest',
              'south',
              'southeast',
              'southwest',
              'east',
              'west',
            ],
          },
          watermarkOpacity: { type: 'integer', minimum: 1, maximum: 100 },
          watermarkScale: { type: 'integer', minimum: 1, maximum: 100 },
          watermarkMargin: { type: 'integer', minimum: 0, maximum: 500 },
        },
      },
      PrewarmInput: {
        type: 'object',
        additionalProperties: false,
        anyOf: [{ required: ['src'] }, { required: ['sources'] }],
        properties: {
          src: { type: 'string', format: 'uri' },
          sources: {
            type: 'array',
            minItems: 1,
            maxItems: 20,
            items: { type: 'string', format: 'uri' },
          },
          widths: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            items: { type: 'integer', minimum: 1, maximum: 5000 },
          },
          formats: {
            type: 'array',
            minItems: 1,
            maxItems: 5,
            items: {
              type: 'string',
              enum: ['auto', 'avif', 'webp', 'jpeg', 'png'],
            },
          },
          quality: { type: 'integer', minimum: 30, maximum: 100 },
          fit: {
            type: 'string',
            enum: ['contain', 'cover', 'fill', 'inside'],
          },
          dpr: { type: 'integer', minimum: 1, maximum: 3 },
        },
      },
      DomainInput: {
        type: 'object',
        additionalProperties: false,
        required: ['host'],
        properties: {
          host: {
            type: 'string',
            description: 'Public source hostname, such as assets.example.com.',
          },
        },
      },
    },
  },
}
