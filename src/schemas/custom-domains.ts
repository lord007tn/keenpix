import { z } from 'zod'
import { nonEmptyStringSchema } from './common'

const HOSTNAME_RE =
  /^(?=.{4,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/
const SCHEME_RE = /^https?:\/\//
const PATH_RE = /\/.*$/
const PORT_RE = /:\d+$/

export const customDomainHostnameSchema = nonEmptyStringSchema(
  'Enter a custom domain.',
)
  .max(253, 'Use 253 characters or fewer.')
  .transform((value) =>
    value
      .trim()
      .toLowerCase()
      .replace(SCHEME_RE, '')
      .replace(PATH_RE, '')
      .replace(PORT_RE, ''),
  )
  .refine((hostname) => HOSTNAME_RE.test(hostname), {
    message: 'Enter a hostname such as images.example.com.',
  })

export const listCustomDomainsSchema = z.object({
  projectId: nonEmptyStringSchema(),
})

export const createCustomDomainSchema = listCustomDomainsSchema.extend({
  hostname: customDomainHostnameSchema,
})

export const mutateCustomDomainSchema = listCustomDomainsSchema.extend({
  id: nonEmptyStringSchema(),
})
