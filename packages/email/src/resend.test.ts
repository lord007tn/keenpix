import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendResendMail } from './resend'

const config = {
  from: 'Keenpix <no-reply@keenpix.com>',
  provider: 'resend' as const,
  token: 'test-token',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendResendMail', () => {
  it('bounds the provider request with an abort signal', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)

    await sendResendMail(
      {
        subject: 'Verify your account',
        text: 'Verification body',
        to: 'customer@example.com',
      },
      config,
    )

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('does not expose provider response details in errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 422,
          text: () => Promise.resolve('customer@example.com is suppressed'),
        }),
      ),
    )

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
})
