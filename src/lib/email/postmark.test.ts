import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/env/server', () => ({
  env: {
    POSTMARK_API_KEY: 'server-token',
    POSTMARK_FROM: 'Keenpix <no-reply@keenpix.com>',
    POSTMARK_MESSAGE_STREAM: 'outbound',
  },
}))

const { sendPostmarkMail } = await import('./postmark')

describe('sendPostmarkMail', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('submits transactional mail to the configured message stream', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ErrorCode: 0,
          Message: 'OK',
          MessageID: 'message-id',
        }),
        { status: 200 },
      ),
    )

    await sendPostmarkMail({
      to: 'recipient@example.com',
      subject: 'Verify your email',
      text: 'Verification body',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.postmarkapp.com/email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Postmark-Server-Token': 'server-token',
        }),
      }),
    )
    const request = fetchMock.mock.calls[0]?.[1]
    expect(JSON.parse(String(request?.body))).toMatchObject({
      From: 'Keenpix <no-reply@keenpix.com>',
      To: 'recipient@example.com',
      MessageStream: 'outbound',
    })
  })

  it('logs only Postmark status codes when an error contains recipient PII', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ErrorCode: 406,
          Message: 'Inactive recipients include private-recipient@example.com.',
        }),
        { status: 422 },
      ),
    )

    await expect(
      sendPostmarkMail({
        to: 'private-recipient@example.com',
        subject: 'Verify your email',
        text: 'Verification body',
      }),
    ).rejects.toThrow('Postmark send failed (422, code 406)')
  })

  it('rejects a malformed success response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not-json', { status: 200 }),
    )

    await expect(
      sendPostmarkMail({
        to: 'recipient@example.com',
        subject: 'Verify your email',
        text: 'Verification body',
      }),
    ).rejects.toThrow('Postmark send failed (200)')
  })
})
