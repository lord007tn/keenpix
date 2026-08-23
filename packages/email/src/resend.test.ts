import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendResendMail } from './resend'

const { sendMock, resendMock } = vi.hoisted(() => {
  const send = vi.fn()
  return {
    sendMock: send,
    resendMock: vi.fn(() => ({ emails: { send } })),
  }
})

vi.mock('resend', () => ({ Resend: resendMock }))

const config = {
  from: 'Keenpix <no-reply@keenpix.com>',
  provider: 'resend' as const,
  token: 'test-token',
}

beforeEach(() => {
  sendMock.mockReset()
  resendMock.mockClear()
})

describe('sendResendMail', () => {
  it('sends through the Resend SDK with the configured token', async () => {
    sendMock.mockResolvedValue({ data: { id: 'email-id' }, error: null })

    await sendResendMail(
      {
        subject: 'Verify your account',
        text: 'Verification body',
        to: 'customer@example.com',
      },
      config,
    )

    expect(resendMock).toHaveBeenCalledWith('test-token')
    expect(sendMock).toHaveBeenCalledWith({
      from: 'Keenpix <no-reply@keenpix.com>',
      html: undefined,
      subject: 'Verify your account',
      text: 'Verification body',
      to: 'customer@example.com',
    })
  })

  it('does not expose provider response details in errors', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: {
        message: 'customer@example.com is suppressed',
        name: 'validation_error',
        statusCode: 422,
      },
    })

    await expect(
      sendResendMail(
        {
          subject: 'Verify your account',
          text: 'Verification body',
          to: 'customer@example.com',
        },
        config,
      ),
    ).rejects.toThrow('Resend send failed (422)')
  })

  it('falls back to the error name when no status code is present', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: {
        message: 'network failure',
        name: 'application_error',
        statusCode: null,
      },
    })

    await expect(
      sendResendMail(
        {
          subject: 'Verify your account',
          text: 'Verification body',
          to: 'customer@example.com',
        },
        config,
      ),
    ).rejects.toThrow('Resend send failed (application_error)')
  })
})
