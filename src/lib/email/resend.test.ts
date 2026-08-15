import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/env/server', () => ({
  env: {
    RESEND_API_KEY: 'test-token',
    RESEND_FROM: 'Keenpix <no-reply@keenpix.com>',
  },
}))

const { sendResendMail } = await import('./resend')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendResendMail', () => {
  it('bounds the provider request with an abort signal', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)

    await sendResendMail({
      subject: 'Verify your account',
      text: 'Verification body',
      to: 'customer@example.com',
    })

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
      sendResendMail({
        subject: 'Verify your account',
        text: 'Verification body',
        to: 'customer@example.com',
      }),
    ).rejects.toThrow('Resend send failed (422)')
  })
})
