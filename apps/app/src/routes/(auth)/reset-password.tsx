import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth/client'
import { noIndexPageHead } from '@/shared/seo'

export const Route = createFileRoute('/(auth)/reset-password')({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  head: () =>
    noIndexPageHead(
      'Set a new password',
      'Choose a new password for your Keenpix account.',
    ),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { token } = Route.useSearch()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      setError('This reset link is invalid or has expired.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setBusy(true)
    setError(null)
    const { error: err } = await authClient.resetPassword({
      newPassword: password,
      token,
    })
    setBusy(false)
    if (err) {
      setError(err.message ?? 'Could not reset your password.')
      return
    }
    toast.success('Password updated — sign in with your new password.')
    navigate({ to: '/login' })
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
          <CardTitle>Set a new password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form className="flex flex-col gap-3" onSubmit={submit}>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label className="sr-only" htmlFor="password">
                New password
              </Label>
              <Input
                autoComplete="new-password"
                autoFocus
                id="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                required
                type="password"
                value={password}
              />
            </div>
            <Button disabled={busy || !token} type="submit">
              {busy ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
