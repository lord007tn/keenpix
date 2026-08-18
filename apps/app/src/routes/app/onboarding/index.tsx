import { createFileRoute, redirect } from '@tanstack/react-router'
import { OnboardingPage } from '@/features/onboarding/onboarding-page'
import { appPageHead } from '@/shared/seo'

export const Route = createFileRoute('/app/onboarding/')({
  beforeLoad: ({ context }) => {
    if (!context.cloud || context.workspaceReady) {
      throw redirect({ to: '/app/dashboard', search: { range: '24h' } })
    }
  },
  head: () =>
    appPageHead(
      'Get started',
      'Activate your Keenpix workspace and create your first image project.',
    ),
  component: OnboardingPage,
})
