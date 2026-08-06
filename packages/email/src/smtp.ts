import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import type { EmailConfig, MailInput } from './types'

type SmtpTransportOptions = SMTPTransport.Options & {
  allowInternalNetworkInterfaces?: boolean
}

export async function sendSmtpMail(
  input: MailInput,
  config: Extract<EmailConfig, { provider: 'smtp' }>,
) {
  if (!(config.host && config.fromEmail)) {
    throw new Error('SMTP is not configured')
  }
  const from = config.fromName
    ? `"${config.fromName.replaceAll('"', "'")}" <${config.fromEmail}>`
    : config.fromEmail
  const options: SmtpTransportOptions = {
    allowInternalNetworkInterfaces: true,
    auth: config.username
      ? { pass: config.password ?? '', user: config.username }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    host: config.host,
    port: config.port ?? 587,
    secure: config.secure ?? false,
    socketTimeout: 15_000,
  }
  const transport = nodemailer.createTransport(options)
  try {
    await transport.sendMail({
      from,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: input.to,
    })
  } finally {
    transport.close()
  }
}
