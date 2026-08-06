import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendPostmarkMail } from './postmark'

const config = {
  from: 'Keenpix <no-reply@keenpix.com>',
  messageStream: 'outbound',
  provider: 'postmark' as const,
  token: 'server-token',
}

describe('sendPostmarkMail', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('submits transactional mail to the configured message stream', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ErrorCode: 0 }), { status: 200 }),
      )

    await sendPostmarkMail(
      {
        subject: 'Verify your email',
        text: 'Verification body',
        to: 'recipient@example.com',
      },
      config,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.postmarkapp.com/email',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Postmark-Server-Token': 'server-token',
        }),
        method: 'POST',
        signal: expect.any(AbortSignal),
      }),
    )
    const request = fetchMock.mock.calls[0]?.[1]
    expect(JSON.parse(String(request?.body))).toMatchObject({
      From: 'Keenpix <no-reply@keenpix.com>',
      MessageStream: 'outbound',
      To: 'recipient@example.com',
    })
  })

  it('keeps provider response PII out of errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ErrorCode: 406,
          Message: 'Inactive recipient private@example.com',
        }),
        { status: 422 },
      ),
    )

    await expect(
      sendPostmarkMail(
        { subject: 'Verify', text: 'Body', to: 'private@example.com' },
        config,
      ),
    ).rejects.toThrow('Postmark send failed (422, code 406)')
  })
})
