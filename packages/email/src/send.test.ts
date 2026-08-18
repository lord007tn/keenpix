import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendPostmarkMail = vi.hoisted(() => vi.fn())
const sendResendMail = vi.hoisted(() => vi.fn())
const sendSmtpMail = vi.hoisted(() => vi.fn())

vi.mock('./postmark', () => ({ sendPostmarkMail }))
vi.mock('./resend', () => ({ sendResendMail }))
vi.mock('./smtp', () => ({ sendSmtpMail }))

const { sendEmail } = await import('./send')
const input = { subject: 'Hello', text: 'Body', to: 'user@example.com' }

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fails clearly when transactional email is disabled', async () => {
    await expect(sendEmail(input, {})).rejects.toThrow('EMAIL_PROVIDER')
  })

  it('dispatches to only the configured provider', async () => {
    const config = {
      from: 'Keenpix <no-reply@keenpix.com>',
      provider: 'postmark' as const,
      token: 'token',
    }

    await sendEmail(input, config)

    expect(sendPostmarkMail).toHaveBeenCalledWith(input, config)
    expect(sendResendMail).not.toHaveBeenCalled()
    expect(sendSmtpMail).not.toHaveBeenCalled()
  })
})
