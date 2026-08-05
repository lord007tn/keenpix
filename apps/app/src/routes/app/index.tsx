import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/')({
  beforeLoad: ({ context }) => {
    if (context.cloud && !context.workspaceReady) {
      throw redirect({ to: '/app/onboarding' })
    }
    throw redirect({ to: '/app/dashboard', search: { range: '24h' } })
  },
})
