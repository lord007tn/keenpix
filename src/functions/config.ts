import { createServerFn } from '@tanstack/react-start'

/**
 * Public, unauthenticated config the landing route needs at render time.
 * `KEENPIX_SELF_HOST=true` turns off the marketing site and shows a minimal
 * "this is a self-hosted instance" splash instead.
 */
export const getPublicConfigFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { isSelfHosted } = await import('@/lib/deployment')
    return {
      selfHost: isSelfHosted(),
    }
  },
)
