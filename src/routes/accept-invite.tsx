import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/lib/auth/client'
import { noIndexPageHead } from '@/shared/seo'

export const Route = createFileRoute('/accept-invite')({
  head: () =>
    noIndexPageHead(
      'Accept invitation',
      'Accept your invitation to join a Keenpix organization.',
    ),
  validateSearch: (search: Record<string, unknown>): { id?: string } => ({
    id: typeof search.id === 'string' ? search.id : undefined,
  }),
  component: AcceptInvitePage,
})

function AcceptInvitePage() {
  const { id } = Route.useSearch()
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const [busy, setBusy] = useState(false)

  async function accept() {
    if (!id) {
      return
    }
    setBusy(true)
    const { error } = await authClient.organization.acceptInvitation({
      invitationId: id,
    })
    if (error) {
      toast.error(error.message ?? 'Could not accept the invitation')
      setBusy(false)
      return
    }
    toast.success('Invitation accepted')
    navigate({ to: '/app/dashboard', search: { range: '30d' } })
  }

  function renderBody() {
    if (!id) {
      return (
        <p className="text-muted-foreground text-sm">
          This invitation link is missing or invalid. Ask whoever invited you to
          resend it.
        </p>
      )
    }
    if (isPending) {
      return <p className="text-muted-foreground text-sm">Loading…</p>
    }
    if (session?.user) {
      return (
        <>
          <p className="text-muted-foreground text-sm">
            You're signed in as <strong>{session.user.email}</strong>. Accept to
            join the organization you were invited to.
          </p>
          <Button disabled={busy} onClick={accept}>
            {busy ? 'Accepting…' : 'Accept invitation'}
          </Button>
        </>
      )
    }
    return (
      <>
        <p className="text-muted-foreground text-sm">
          Sign in with the email your invitation was sent to and you’ll return
          here to accept. New to keenpix? Create an account, verify your email,
          then open this link again.
        </p>
        <div className="flex justify-center gap-2">
          <Button
            render={
              <Link
                search={{ redirect: `/accept-invite?id=${id}` }}
                to="/login"
              />
            }
            variant="outline"
          >
            Sign in
          </Button>
          <Button render={<Link to="/signup" />}>Create account</Button>
        </div>
      </>
    )
  }

  return (
    <main
      className="relative flex min-h-svh items-center justify-center bg-muted/30 p-6"
      id="main-content"
    >
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <KeenpixLogo className="mb-2" />
          <CardTitle>Join the organization</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-center">
          {renderBody()}
        </CardContent>
      </Card>
    </main>
  )
}
