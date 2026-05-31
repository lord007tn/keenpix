import { z } from 'zod'
import { nonEmptyStringSchema } from './common'

const staffRoleSchema = z.enum(['admin', 'staff'])

export const createInvitationSchema = z.object({
  email: z.email('Enter a valid email address.'),
  expiresDays: z.number().int().min(1).max(30).optional(),
  role: staffRoleSchema,
  sendEmail: z.boolean(),
})

export const invitationTokenSchema = z.object({
  token: z.string().min(20),
})

export const acceptInvitationSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80, 'Use 80 characters or fewer.')
    .transform((value) => value || undefined),
  password: z.string().min(8, 'Use at least 8 characters.'),
  token: z.string().min(20),
})

export const revokeInvitationSchema = z.object({
  id: nonEmptyStringSchema(),
})

export const smtpSettingsSchema = z.object({
  enabled: z.boolean(),
  fromEmail: z.email('Enter a valid sender email.').or(z.literal('')),
  fromName: z.string().trim().max(80, 'Use 80 characters or fewer.'),
  host: z.string().trim().max(255, 'Use 255 characters or fewer.'),
  password: z.string().max(500, 'Use 500 characters or fewer.'),
  port: z
    .string()
    .refine((value) => value.trim() !== '', {
      message: 'Enter an SMTP port.',
    })
    .refine((value) => Number.isInteger(Number(value)), {
      message: 'Use a whole port number.',
    })
    .transform(Number)
    .refine((value) => value >= 1 && value <= 65_535, {
      message: 'Use a port from 1 to 65535.',
    }),
  secure: z.boolean(),
  username: z.string().trim().max(255, 'Use 255 characters or fewer.'),
})

export const sendTestEmailSchema = z.object({
  to: z.email('Enter a valid recipient email.'),
})

export type CreateInvitationInput = z.input<typeof createInvitationSchema>
export type SmtpSettingsInput = z.input<typeof smtpSettingsSchema>
export type SendTestEmailInput = z.input<typeof sendTestEmailSchema>
