import { jsonObject } from '../../utils/json/object'

export function internalApiKeyData(apiKey: {
  createdAt: Date
  enabled: boolean
  expiresAt: Date | null
  id: string
  lastRequest: Date | null
  metadata: string | null
  name: string | null
  permissions: string | null
  prefix: string | null
  start: string | null
}) {
  const metadata = jsonObject(apiKey.metadata)
  const projectId = metadata ? Reflect.get(metadata, 'projectId') : null
  const permissions = jsonObject(apiKey.permissions)

  return {
    id: apiKey.id,
    name: apiKey.name,
    start: apiKey.start,
    prefix: apiKey.prefix,
    enabled: apiKey.enabled,
    lastRequest: apiKey.lastRequest,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
    metadata:
      typeof projectId === 'string' && projectId.trim()
        ? { projectId: projectId.trim() }
        : null,
    permissions: permissions
      ? Object.fromEntries(
          Object.entries(permissions).flatMap(([resource, actions]) =>
            Array.isArray(actions)
              ? [
                  [
                    resource,
                    actions.filter((action) => typeof action === 'string'),
                  ],
                ]
              : [],
          ),
        )
      : null,
  }
}
