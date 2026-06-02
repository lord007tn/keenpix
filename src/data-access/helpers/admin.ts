import { jsonObject } from '../utils/json'

const ADMIN_ROLE = 'admin'
const STAFF_ROLE = 'staff'

export type StaffRole = typeof ADMIN_ROLE | typeof STAFF_ROLE

export function staffRole(value: string) {
  return value === ADMIN_ROLE ? ADMIN_ROLE : STAFF_ROLE
}

export function staffUserData(user: {
  createdAt: Date
  email: string
  id: string
  name: string | null
  role: string
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  }
}

export function staffInvitationData(invitation: {
  acceptedAt: Date | null
  createdAt: Date
  email: string
  expiresAt: Date
  id: string
  role: string
  status: string
}) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: staffRole(invitation.role),
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
  }
}

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
