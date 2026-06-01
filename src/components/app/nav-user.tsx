import { Link, useNavigate } from '@tanstack/react-router'
import {
  BookOpenIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import type { SessionUser } from '@/functions/auth'
import { signOut } from '@/lib/auth/client'

const NAME_SPLIT_RE = /[\s@._-]+/

function initials(user: SessionUser): string {
  const base = (user.name?.trim() || user.email).trim()
  const parts = base.split(NAME_SPLIT_RE).filter(Boolean)
  const first = parts[0]?.[0] ?? base[0] ?? '?'
  const second = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : ''
  return (first + second).toUpperCase()
}

export function NavUser({ user }: { user: SessionUser }) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const [pending, setPending] = useState(false)
  const isDark = resolvedTheme === 'dark'
  const display = user.name?.trim() || user.email

  async function handleSignOut() {
    setPending(true)
    try {
      await signOut()
    } finally {
      navigate({ to: '/login' })
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="aria-expanded:bg-sidebar-accent"
                size="lg"
              />
            }
          >
            <Avatar className="size-8">
              <AvatarFallback>{initials(user)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-0.5 leading-none">
              <span className="truncate font-semibold">{display}</span>
              <span className="truncate text-muted-foreground text-xs">
                {user.email}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5">
                  <Avatar className="size-8">
                    <AvatarFallback>{initials(user)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col leading-none">
                    <span className="truncate font-medium text-foreground text-sm">
                      {display}
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to="/app/account" />}>
                <UserIcon />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  // biome-ignore lint/a11y/useAnchorContent: the icon + "Documentation" label are merged into the anchor by Base UI's render prop
                  <a href="/docs" />
                }
              >
                <BookOpenIcon />
                Documentation
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
              {isDark ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={pending}
              onClick={handleSignOut}
              variant="destructive"
            >
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
