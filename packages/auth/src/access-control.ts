import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements } from 'better-auth/plugins/organization/access'

export const organizationAccess = createAccessControl({
  ...defaultStatements,
  apiKey: ['create', 'read', 'update', 'delete'],
})

export const organizationRoles = {
  owner: organizationAccess.newRole({
    organization: ['update', 'delete'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
    team: ['create', 'update', 'delete'],
    ac: ['create', 'read', 'update', 'delete'],
    apiKey: ['create', 'read', 'update', 'delete'],
  }),
  admin: organizationAccess.newRole({
    organization: ['update'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
    team: ['create', 'update', 'delete'],
    ac: ['create', 'read', 'update', 'delete'],
    apiKey: ['create', 'read', 'update', 'delete'],
  }),
  member: organizationAccess.newRole({
    organization: [],
    member: [],
    invitation: [],
    team: [],
    ac: ['read'],
    apiKey: [],
  }),
}
