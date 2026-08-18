import { sendPostmarkMail } from './postmark'
import { sendResendMail } from './resend'
import { sendSmtpMail } from './smtp'
import type { EmailConfig, MailInput } from './types'

export function sendEmail(input: MailInput, config: EmailConfig) {
  switch (config.provider) {
    case 'postmark':
      return sendPostmarkMail(input, config)
    case 'resend':
      return sendResendMail(input, config)
    case 'smtp':
      return sendSmtpMail(input, config)
    default:
      return Promise.reject(
        new Error('Email is not configured (set EMAIL_PROVIDER)'),
      )
  }
}
