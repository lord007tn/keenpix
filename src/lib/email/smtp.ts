import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import { env } from '@/env/server'
import type { MailInput } from './types'

type SmtpTransportOptions = SMTPTransport.Options & {
  allowInternalNetworkInterfaces?: boolean
}

// SMTP is configured entirely from the environment (EMAIL_PROVIDER=smtp). Returns
// undefined when the minimum required vars are missing so the caller can surface a
// clear "not configured" error instead of building a half-formed transport.
function envSmtpConfig() {
  if (!(env.SMTP_HOST && env.SMTP_FROM_EMAIL)) {
    return
  }
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === 'true' || env.SMTP_SECURE === '1',
    username: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    fromEmail: env.SMTP_FROM_EMAIL,
    fromName: env.SMTP_FROM_NAME,
  }
}

export async function sendSmtpMail(input: MailInput): Promise<void> {
  const config = envSmtpConfig()
  if (!config) {
    throw new Error('SMTP is not configured')
  }
  const from = config.fromName
    ? `"${config.fromName.replaceAll('"', "'")}" <${config.fromEmail}>`
    : config.fromEmail
  const options: SmtpTransportOptions = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.username
      ? { user: config.username, pass: config.password ?? '' }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    // Self-hosters often point at Mailpit/MailHog/Postfix on a private host.
    allowInternalNetworkInterfaces: true,
  }
  const transport = nodemailer.createTransport(options)
  try {
    await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    })
  } finally {
    transport.close()
  }
}
