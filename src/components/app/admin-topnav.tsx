import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ShieldIcon } from 'lucide-react'
import { NavUser } from '@/components/app/nav-user'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { Badge } from '@/components/ui/badge'
import type { SessionUser } from '@/functions/auth'

// Shell for the standalone operator console (/admin). Deliberately distinct from
// the tenant app top-nav — no project switcher or project-scoped tabs — so it
// reads as a separate surface, with a clear path back to the tenant app.
export function AdminTopnav({
  cloud,
  user,
}: {
  cloud: boolean
  user: SessionUser
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-3 sm:px-4">
      <Link
        className="flex items-center gap-2 font-semibold text-sm"
        to="/admin"
      >
        <ShieldIcon className="size-4 text-primary" />
        Operator console
      </Link>
      <Badge variant="success">Admin</Badge>
      <div className="flex-1" />
      <Link
        className="mr-1 inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
        to="/app"
      >
        <ArrowLeftIcon className="size-4" />
        Back to app
      </Link>
      <ModeToggle />
      <NavUser admin cloud={cloud} user={user} />
    </header>
  )
}
