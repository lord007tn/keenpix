import { Building2Icon, CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth/client'

export function OrganizationSwitcher() {
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const { data: organizations } = authClient.useListOrganizations()
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)
  const active = activeOrganization ?? organizations?.[0]

  async function switchOrganization(organizationId: string) {
    if (organizationId === activeOrganization?.id || switchingTo) {
      return
    }
    setSwitchingTo(organizationId)
    const { error } = await authClient.organization.setActive({
      organizationId,
    })
    if (error) {
      setSwitchingTo(null)
      toast.error(error.message ?? 'Could not switch organization')
      return
    }
    // Organization scope affects every app loader and the current project query.
    // A full same-origin navigation guarantees the new session scope reaches all
    // server functions and clears a project id from the previous organization.
    window.location.assign('/app')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={
          !organizations ||
          organizations.length === 0 ||
          (organizations.length < 2 && Boolean(activeOrganization))
        }
        render={
          <Button
            aria-label={`Organization: ${active?.name ?? 'Loading'}`}
            className="h-11 max-w-36 gap-2 px-2 font-normal"
            variant="ghost"
          />
        }
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
          <Building2Icon className="size-4" />
        </span>
        <span className="hidden truncate font-medium text-sm md:inline">
          {active?.name ?? 'Organization'}
        </span>
        {organizations && (organizations.length > 1 || !activeOrganization) ? (
          <ChevronsUpDownIcon className="text-muted-foreground" />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64" side="bottom">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Organization</DropdownMenuLabel>
          {organizations?.map((organization) => (
            <DropdownMenuItem
              disabled={switchingTo !== null}
              key={organization.id}
              onClick={() => switchOrganization(organization.id)}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted">
                <Building2Icon className="size-4" />
              </span>
              <span className="truncate">{organization.name}</span>
              {organization.id === activeOrganization?.id ? (
                <CheckIcon className="ml-auto size-4" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
