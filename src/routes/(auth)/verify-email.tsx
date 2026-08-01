import { createFileRoute, Link } from '@tanstack/react-router'
import { CheckCircle2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth/client'
import { safeRedirect } from '@/shared/safe-redirect'
import { noIndexPageHead } from '@/shared/seo'

// Branded landing for the email-verification link. better-auth verifies the
// token at its API endpoint and redirects here — with an `error` query param
// when the link is expired/invalid, and cleanly (auto-signed-in) on success.
export const Route = createFileRoute('/(auth)/verify-email')({
  head: () =>
    noIndexPageHead('Verify your email', 'Confirm your Keenpix email address.'),
  validateSearch: (
    search: Record<string, unknown>,
  ): { error?: string; redirect?: string } => ({
    error: typeof search.error === 'string' ? search.error : undefined,
    // Same-origin path to resume after verification (e.g. an org invite).
    redirect: safeRedirect(search.redirect),
  }),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { error, redirect: redirectTo } = Route.useSearch()
  // On success better-auth auto-signs-in and redirects here, so a live session is
  // the real signal — never assume verified just because there's no error param
  // (direct visits and consumed links land here too).
  const { data: session } = authClient.useSession()
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const failed = Boolean(error)
  const verified = !failed && Boolean(session?.user)

  async function resend(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      return
    }
    setResending(true)
    try {
      const { error: err } = await authClient.sendVerificationEmail({
        email: email.trim(),
        callbackURL: '/verify-email',
      })
      if (err) {
        toast.error(err.message ?? 'Could not send the email')
        return
      }
      toast.success('Verification email sent — check your inbox')
    } finally {
      setResending(false)
    }
  }

  let title = 'Verify your email'
  if (failed) {
    title = 'Verification link expired'
  } else if (verified) {
    title = 'Email verified'
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
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {verified ? (
            <>
              <div className="flex flex-col items-center gap-2 text-center">
                <CheckCircle2Icon className="size-8 text-primary" />
                <p className="text-muted-foreground text-sm">
                  Your email is confirmed. You’re all set.
                </p>
              </div>
              {redirectTo ? (
                <Button
                  onClick={() => {
                    window.location.href = redirectTo
                  }}
                >
                  Continue
                </Button>
              ) : (
                <Button render={<Link to="/app" />}>Continue to keenpix</Button>
              )}
            </>
          ) : (
            <>
              <p className="text-center text-muted-foreground text-sm">
                {failed
                  ? 'This verification link is invalid or has expired. Enter your email to get a new one.'
                  : 'Enter your email and we will send a fresh verification link.'}
              </p>
              <form className="flex flex-col gap-3" onSubmit={resend}>
                <Label className="sr-only" htmlFor="email">
                  Email address
                </Label>
                <Input
                  autoComplete="email"
                  autoFocus
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  type="email"
                  value={email}
                />
                <Button disabled={resending || !email.trim()} type="submit">
                  {resending ? 'Sending…' : 'Resend verification email'}
                </Button>
              </form>
              <Link
                className="text-center text-muted-foreground text-sm hover:text-foreground"
                to="/login"
              >
                Back to sign in
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
