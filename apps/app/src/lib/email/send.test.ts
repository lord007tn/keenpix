import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mutable stand-in for the validated env so each test can pick a provider.
const env = vi.hoisted(() => ({
  EMAIL_PROVIDER: undefined as string | undefined,
}))
vi.mock('@/env/server', () => ({ env }))

const sendPostmarkMail = vi.hoisted(() => vi.fn())
const sendResendMail = vi.hoisted(() => vi.fn())
const sendSmtpMail = vi.hoisted(() => vi.fn())
vi.mock('./postmark', () => ({ sendPostmarkMail }))
vi.mock('./resend', () => ({ sendResendMail }))
vi.mock('./smtp', () => ({ sendSmtpMail }))

const { sendPlatformEmail } = await import('./send')

const input = { to: 'a@b.com', subject: 'hi', text: 'body' }
const NO_PROVIDER_ERROR = /EMAIL_PROVIDER/

describe('sendPlatformEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    env.EMAIL_PROVIDER = undefined
  })

  it('throws when no provider is selected', async () => {
    await expect(sendPlatformEmail(input)).rejects.toThrow(NO_PROVIDER_ERROR)
    expect(sendPostmarkMail).not.toHaveBeenCalled()
    expect(sendResendMail).not.toHaveBeenCalled()
    expect(sendSmtpMail).not.toHaveBeenCalled()
  })

  it('dispatches only to Postmark when selected', async () => {
    env.EMAIL_PROVIDER = 'postmark'
    await sendPlatformEmail(input)
    expect(sendPostmarkMail).toHaveBeenCalledWith(input)
    expect(sendResendMail).not.toHaveBeenCalled()
    expect(sendSmtpMail).not.toHaveBeenCalled()
  })

  it('dispatches only to Resend when selected', async () => {
    env.EMAIL_PROVIDER = 'resend'
    await sendPlatformEmail(input)
    expect(sendResendMail).toHaveBeenCalledWith(input)
    expect(sendPostmarkMail).not.toHaveBeenCalled()
    expect(sendSmtpMail).not.toHaveBeenCalled()
  })

  it('dispatches only to SMTP when selected', async () => {
    env.EMAIL_PROVIDER = 'smtp'
    await sendPlatformEmail(input)
    expect(sendSmtpMail).toHaveBeenCalledWith(input)
    expect(sendPostmarkMail).not.toHaveBeenCalled()
    expect(sendResendMail).not.toHaveBeenCalled()
  })
})
