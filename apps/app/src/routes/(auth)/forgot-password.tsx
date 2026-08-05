import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth/client'
import { noIndexPageHead } from '@/shared/seo'

export const Route = createFileRoute('/(auth)/forgot-password')({
  head: () =>
    noIndexPageHead(
      'Reset password',
      'Request a password reset link for your Keenpix account.',
    ),
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    })
    setBusy(false)
    if (err) {
      setError(err.message ?? 'Could not send the reset email.')
      return
    }
    setSent(true)
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
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {sent ? (
            <Alert>
              <AlertDescription>
                If an account exists for {email}, a reset link is on its way.
                Check your inbox.
              </AlertDescription>
            </Alert>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={submit}>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <Label className="sr-only" htmlFor="email">
                  Email address
                </Label>
                <Input
                  autoComplete="email"
                  autoFocus
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
              <Button disabled={busy || !email} type="submit">
                {busy ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}
          <Link
            className="text-center text-muted-foreground text-sm hover:text-foreground"
            to="/login"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
