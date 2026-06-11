import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import type { EffectiveSmtpSettings } from '@/data-access/admin/smtp'

type SmtpTransportOptions = SMTPTransport.Options & {
  allowInternalNetworkInterfaces?: boolean
}

export interface MailInput {
  html?: string
  subject: string
  text: string
  to: string
}

function sender(settings: EffectiveSmtpSettings) {
  return settings.fromName
    ? `"${settings.fromName.replaceAll('"', "'")}" <${settings.fromEmail}>`
    : settings.fromEmail
}

function createTransport(settings: EffectiveSmtpSettings) {
  const options: SmtpTransportOptions = {
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: settings.username
      ? {
          user: settings.username,
          pass: settings.password ?? '',
        }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    // Self-hosters often test against Mailpit/MailHog/Postfix on a private host.
    allowInternalNetworkInterfaces: true,
  }

  return nodemailer.createTransport(options)
}

export async function verifySmtp(settings: EffectiveSmtpSettings) {
  if (!settings.enabled) {
    throw new Error('SMTP is disabled')
  }
  const transport = createTransport(settings)
  await transport.verify()
  transport.close()
}

export async function sendSmtpMail(
  settings: EffectiveSmtpSettings,
  input: MailInput,
) {
  if (!settings.enabled) {
    throw new Error('SMTP is disabled')
  }
  const transport = createTransport(settings)
  try {
    await transport.sendMail({
      from: sender(settings),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    })
  } finally {
    transport.close()
  }
}
