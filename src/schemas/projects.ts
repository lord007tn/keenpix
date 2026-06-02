import { z } from 'zod'
import { nonEmptyStringSchema, projectEnvSchema } from './common'

const HOST_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/
const SCHEME_RE = /^https?:\/\//
const PATH_RE = /\/.*$/
const PORT_RE = /:\d+$/

const normalizeAllowedHost = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(SCHEME_RE, '')
    .replace(PATH_RE, '')
    .replace(PORT_RE, '')

const originUrlSchema = nonEmptyStringSchema('Enter an origin URL.')
  .refine(
    (value) => {
      try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch {
        return false
      }
    },
    { message: 'Enter a valid http or https URL.' },
  )
  .refine(
    (value) => {
      try {
        return Boolean(new URL(value).hostname)
      } catch {
        return false
      }
    },
    { message: 'Enter a URL with a hostname.' },
  )

export const createProjectSchema = z.object({
  name: nonEmptyStringSchema('Enter a project name.').max(
    80,
    'Use 80 characters or fewer.',
  ),
  origin: originUrlSchema,
  env: projectEnvSchema,
})

export const allowedHostValueSchema = nonEmptyStringSchema('Enter a host.')
  .max(255, 'Use 255 characters or fewer.')
  .transform(normalizeAllowedHost)
  .refine((host) => HOST_RE.test(host), {
    message: 'Enter a valid host, e.g. images.example.com.',
  })

export const allowedHostSchema = z.object({
  projectId: nonEmptyStringSchema(),
  host: allowedHostValueSchema,
})

export const projectSettingsSchema = z.object({
  projectId: nonEmptyStringSchema(),
  autoFormat: z.boolean().optional(),
  stripMetadata: z.boolean().optional(),
  defaultQuality: z.coerce
    .number()
    .int('Use a whole number.')
    .min(30, 'Use a value from 30 to 100.')
    .max(100, 'Use a value from 30 to 100.')
    .optional(),
})

export const projectQualitySchema = z.object({
  defaultQuality: z
    .string()
    .refine((value) => value.trim() !== '', {
      message: 'Enter a default quality.',
    })
    .refine((value) => Number.isInteger(Number(value)), {
      message: 'Use a whole number.',
    })
    .refine(
      (value) => {
        const quality = Number(value)
        return quality >= 30 && quality <= 100
      },
      { message: 'Use a value from 30 to 100.' },
    ),
})

export const internalCreateProjectSchema = createProjectSchema.extend({
  allowedOrigins: z.array(allowedHostValueSchema).optional(),
})

export const internalProjectSettingsPatchSchema = projectSettingsSchema
  .omit({ projectId: true })
  .refine(
    (value) =>
      value.autoFormat !== undefined ||
      value.stripMetadata !== undefined ||
      value.defaultQuality !== undefined,
    { message: 'Send at least one setting to update.' },
  )

export type CreateProjectInput = z.input<typeof createProjectSchema>
export type ProjectSettingsInput = z.input<typeof projectSettingsSchema>
