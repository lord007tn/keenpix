import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/errors/common'
import { acceptInvitationFn, getInvitationFn } from '@/functions/admin'
import { authClient } from '@/lib/auth/client'

export const Route = createFileRoute('/invite/$token')({
  loader: ({ params }) => getInvitationFn({ data: { token: params.token } }),
  head: () => ({
    meta: [
      { title: 'Accept invitation - Keenpix' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: InvitePage,
})

function InvitePage() {
  const invitation = Route.useLoaderData()
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inactive =
    !invitation ||
    invitation.status !== 'pending' ||
    new Date(invitation.expiresAt).getTime() < Date.now()

  async function accept() {
    setPending(true)
    setError(null)
    try {
      const user = await acceptInvitationFn({
        data: { token, name: name.trim() || undefined, password },
      })
      await authClient.signIn.email({ email: user.email, password })
      toast.success('Invitation accepted')
      navigate({ to: '/app/dashboard', search: { range: '30d' } })
    } catch (e) {
      setError(getErrorMessage(e, 'Could not accept invitation'))
    } finally {
      setPending(false)
    }
  }

  return (
    <main
      className="relative flex min-h-svh items-center justify-center bg-muted/30 p-6"
      id="main-content"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <KeenpixLogo className="mb-2" />
          <CardTitle>Accept invitation</CardTitle>
          <CardDescription>
            {invitation
              ? `Join Keenpix as ${invitation.email}.`
              : 'This invitation link is not valid.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {inactive ? (
            <Alert variant="destructive">
              <AlertDescription>
                This invitation is missing, expired, or no longer active.
              </AlertDescription>
            </Alert>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                accept()
              }}
            >
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-name">Name</Label>
                <Input
                  autoComplete="name"
                  id="invite-name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  value={name}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-password">Password</Label>
                <Input
                  autoComplete="new-password"
                  id="invite-password"
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  value={password}
                />
              </div>
              <Button disabled={pending || password.length < 8} type="submit">
                {pending ? 'Joining...' : 'Join workspace'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
