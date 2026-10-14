import { createServerFn } from '@tanstack/react-start'
import {
  createCustomDomain,
  deleteCustomDomain,
  listCustomDomains,
  refreshCustomDomain,
} from '@/actions/custom-domains'
import {
  authMiddleware,
  requireActiveOrg,
  requireOrgAdmin,
} from '@/lib/auth/guards'
import {
  createCustomDomainSchema,
  listCustomDomainsSchema,
  mutateCustomDomainSchema,
} from '@/schemas/custom-domains'

export const listCustomDomainsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listCustomDomainsSchema)
  .handler(({ data, context }) =>
    listCustomDomains(requireActiveOrg(context), data.projectId),
  )

export const createCustomDomainFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(createCustomDomainSchema)
  .handler(({ data, context }) =>
    createCustomDomain(requireOrgAdmin(context), data.projectId, data.hostname),
  )

export const refreshCustomDomainFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(mutateCustomDomainSchema)
  .handler(({ data, context }) =>
    refreshCustomDomain(requireOrgAdmin(context), data.projectId, data.id),
  )

export const deleteCustomDomainFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(mutateCustomDomainSchema)
  .handler(({ data, context }) =>
    deleteCustomDomain(requireOrgAdmin(context), data.projectId, data.id),
  )
