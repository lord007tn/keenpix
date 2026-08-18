import { useRouteContext } from '@tanstack/react-router'
import { OnboardingChecklist } from '@/features/onboarding/onboarding-checklist'
import { useProject } from '@/stores/project-context'

export function OnboardingPage() {
  const { cloud, orgRole, productAccess } = useRouteContext({ from: '/app' })
  const { projects } = useProject()

  return (
    <div className="flex flex-1 flex-col bg-muted/10">
      <OnboardingChecklist
        cloud={cloud}
        entitled={productAccess}
        hasProjects={projects.length > 0}
        orgRole={orgRole}
      />
    </div>
  )
}
