export interface MailInput {
  html?: string
  subject: string
  text: string
  to: string
}

export type EmailConfig =
  | {
      from?: string
      messageStream?: string
      provider: 'postmark'
      token?: string
    }
  | {
      from?: string
      provider: 'resend'
      token?: string
    }
  | {
      fromEmail?: string
      fromName?: string
      host?: string
      password?: string
      port?: number
      provider: 'smtp'
      secure?: boolean
      username?: string
    }
  | { provider?: undefined }
