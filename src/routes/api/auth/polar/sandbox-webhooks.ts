import { validateEvent } from '@polar-sh/sdk/webhooks'
import { createFileRoute } from '@tanstack/react-router'
import { env } from '@/env/server'

const responseHeaders = { 'cache-control': 'no-store' }

// Polar sandbox delivery verification on the production apex. This endpoint is
// intentionally acknowledgement-only: it validates the sandbox endpoint's own
// signature and returns the event type, but imports no subscription/data-access
// code and can never change production customers, entitlements, or usage.
export async function handlePolarSandboxWebhook(request: Request) {
  const secret = env.POLAR_SANDBOX_WEBHOOK_SECRET
  if (!secret) {
    return new Response('Not found', { headers: responseHeaders, status: 404 })
  }
  const body = await request.text()
  try {
    const event = validateEvent(
      body,
      {
        'webhook-id': request.headers.get('webhook-id') ?? '',
        'webhook-signature': request.headers.get('webhook-signature') ?? '',
        'webhook-timestamp': request.headers.get('webhook-timestamp') ?? '',
      },
      secret,
    )
    return Response.json(
      {
        environment: 'sandbox',
        received: true,
        type: event.type,
      },
      { headers: responseHeaders },
    )
  } catch {
    return new Response('Invalid webhook signature or payload', {
      headers: responseHeaders,
      status: 400,
    })
  }
}

export const Route = createFileRoute('/api/auth/polar/sandbox-webhooks')({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) =>
        handlePolarSandboxWebhook(request),
    },
  },
})
