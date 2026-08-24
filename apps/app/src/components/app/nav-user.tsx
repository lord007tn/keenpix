import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  LogOutIcon,
  MoonIcon,
  ShieldIcon,
  SunIcon,
  TagIcon,
  UserIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '@/components/theme/theme-provider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SessionUser } from '@/functions/auth'
import { signOut } from '@/lib/auth/client'
import { cn } from '@/lib/cn/utils'
import { RELEASES_URL } from '@/shared/repository'
import { APP_VERSION } from '@/shared/seo'

const NAME_SPLIT_RE = /[\s@._-]+/

function initials(user: SessionUser): string {
  const base = (user.name?.trim() || user.email).trim()
  const parts = base.split(NAME_SPLIT_RE).filter(Boolean)
  const first = parts[0]?.[0] ?? base[0] ?? '?'
  const second = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : ''
  return (first + second).toUpperCase()
}

// `admin` renders the operator variant: it drops the tenant/product items
// (Plan & billing, Documentation, Releases) so the /admin surface stays a
// standalone operator app rather than an app-within-an-app. `variant="sidebar"`
// is the full-width trigger used in the admin sidebar footer.
export function NavUser({
  admin = false,
  cloud,
  user,
  variant = 'topbar',
}: {
  admin?: boolean
  cloud: boolean
  user: SessionUser
  variant?: 'topbar' | 'sidebar'
}) {
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const [pending, setPending] = useState(false)
  const isDark = resolvedTheme === 'dark'
  const display = user.name?.trim() || user.email
  const isSidebar = variant === 'sidebar'

  async function handleSignOut() {
    setPending(true)
    try {
      await signOut()
    } finally {
      navigate({ to: '/login' })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className={cn(
              isSidebar
                ? 'h-auto w-full justify-start gap-2 px-2 py-1.5'
                : 'gap-1.5 pr-1.5 pl-1',
            )}
            variant="ghost"
          />
        }
      >
        <Avatar className={isSidebar ? 'size-8' : 'size-7'}>
          <AvatarFallback className="text-xs">{initials(user)}</AvatarFallback>
        </Avatar>
        {isSidebar ? (
          <div className="flex min-w-0 flex-1 flex-col text-left leading-none">
            <span className="truncate font-medium text-sm">{display}</span>
            <span className="truncate text-muted-foreground text-xs">
              {user.email}
            </span>
          </div>
        ) : (
          <span className="hidden max-w-32 truncate font-medium text-sm sm:inline">
            {display}
          </span>
        )}
        {isSidebar ? (
          <ChevronsUpDownIcon className="ml-auto text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="text-muted-foreground" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isSidebar ? 'start' : 'end'}
        className="min-w-56"
        side={isSidebar ? 'top' : 'bottom'}
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
          {cloud && !admin ? (
            <DropdownMenuItem
              render={
                <Link search={{ section: 'billing' }} to="/app/account" />
              }
            >
              <CreditCardIcon />
              Plan &amp; billing
            </DropdownMenuItem>
          ) : null}
          {user.role === 'super_admin' && !admin ? (
            <DropdownMenuItem render={<Link to="/admin" />}>
              <ShieldIcon />
              Admin console
            </DropdownMenuItem>
          ) : null}
          {user.role === 'super_admin' && admin ? (
            <DropdownMenuItem render={<Link to="/app" />}>
              <ArrowLeftIcon />
              Back to app
            </DropdownMenuItem>
          ) : null}
          {admin ? null : (
            <DropdownMenuItem
              render={
                // biome-ignore lint/a11y/useAnchorContent: the icon + "Documentation" label are merged into the anchor by Base UI's render prop
                <a href="/docs" />
              }
            >
              <BookOpenIcon />
              Documentation
            </DropdownMenuItem>
          )}
          {admin ? null : (
            <DropdownMenuItem
              render={
                // biome-ignore lint/a11y/useAnchorContent: the icon + version label are merged into the anchor by Base UI's render prop
                <a
                  href={RELEASES_URL}
                  rel="noopener noreferrer"
                  target="_blank"
                />
              }
            >
              <TagIcon />
              Version v{APP_VERSION}
              <span className="ml-auto text-muted-foreground text-xs">
                Releases
              </span>
            </DropdownMenuItem>
          )}
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
  )
}
