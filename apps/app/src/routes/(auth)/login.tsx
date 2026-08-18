import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { GoogleLogo } from '@/components/app/google-logo'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPublicConfigFn } from '@/functions/config'
import { authClient } from '@/lib/auth/client'
import { loginSchema } from '@/schemas/auth'
import { safeRedirect } from '@/shared/safe-redirect'
import { noIndexPageHead } from '@/shared/seo'
import { getFieldError } from '@/utils/validation/form-errors'

export const Route = createFileRoute('/(auth)/login')({
  // `redirect` is a validated same-origin path to return to after sign-in (set
  // when a deep link / invite bounced through login); defaults to the dashboard.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeRedirect(search.redirect),
  }),
  // `cloud` drives whether self-serve sign-up is offered (self-host is invite-only).
  loader: () => getPublicConfigFn(),
  head: () =>
    noIndexPageHead(
      'Sign in',
      'Sign in to manage Keenpix projects, analytics, logs, and workspace settings.',
    ),
  component: LoginPage,
})

function LoginPage() {
  const { cloud, googleAuth } = Route.useLoaderData()
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  // When sign-in is blocked because the email isn't verified, we stash it so the
  // user can resend the verification email without leaving this screen — cloud
  // requires verification, so this is the primary recovery path for a lost email.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onChange: loginSchema,
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null)
      setUnverifiedEmail(null)
      const payload = loginSchema.parse(value)
      const { error: err } = await authClient.signIn.email(payload)
      if (err) {
        // Only the unverified-email case gets the resend affordance. A banned or
        // otherwise-403 account must NOT be told to "verify your email" — fall
        // through so its real message (e.g. the ban reason) is shown.
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          setUnverifiedEmail(payload.email)
          setError('Verify your email before signing in.')
          return
        }
        setError(err.message ?? 'Could not sign in.')
        return
      }
      toast.success('Signed in')
      if (redirect) {
        // Full navigation to the validated same-origin target so its own search
        // params (e.g. an invite id) load cleanly with the new session.
        window.location.href = redirect
        return
      }
      navigate({ to: '/app/dashboard', search: { range: '30d' } })
    },
  })

  async function resendVerification() {
    if (!unverifiedEmail) {
      return
    }
    setResending(true)
    try {
      const { error: err } = await authClient.sendVerificationEmail({
        email: unverifiedEmail,
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

  return (
    <main
      className="relative flex min-h-svh items-center justify-center bg-muted/30 p-6"
      id="main-content"
    >
      <h1 className="sr-only">Sign in to keenpix</h1>
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <KeenpixLogo className="mb-2" />
          <CardTitle>Sign in to keenpix</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {googleAuth ? (
            <Button
              onClick={() =>
                authClient.signIn.social({
                  provider: 'google',
                  callbackURL: redirect ?? '/app/dashboard?range=30d',
                  errorCallbackURL: '/login',
                })
              }
              type="button"
              variant="outline"
            >
              <GoogleLogo data-icon="inline-start" />
              Continue with Google
            </Button>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-col items-start gap-2">
                {error}
                {unverifiedEmail ? (
                  <Button
                    disabled={resending}
                    onClick={resendVerification}
                    size="sm"
                    variant="outline"
                  >
                    {resending ? 'Sending…' : 'Resend verification email'}
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
          >
            <form.Field name="email">
              {(field) => {
                const fieldError = getFieldError(field.state.meta)
                return (
                  <div className="flex flex-col gap-1.5">
                    <Label className="sr-only" htmlFor={field.name}>
                      Email address
                    </Label>
                    <Input
                      aria-describedby={
                        fieldError ? `${field.name}-error` : undefined
                      }
                      aria-invalid={!!fieldError}
                      autoComplete="email"
                      autoFocus
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="you@company.com"
                      type="email"
                      value={field.state.value}
                    />
                    {fieldError ? (
                      <p
                        className="text-destructive text-xs"
                        id={`${field.name}-error`}
                      >
                        {fieldError}
                      </p>
                    ) : null}
                  </div>
                )
              }}
            </form.Field>
            <form.Field name="password">
              {(field) => {
                const fieldError = getFieldError(field.state.meta)
                return (
                  <div className="flex flex-col gap-1.5">
                    <Label className="sr-only" htmlFor={field.name}>
                      Password
                    </Label>
                    <Input
                      aria-describedby={
                        fieldError ? `${field.name}-error` : undefined
                      }
                      aria-invalid={!!fieldError}
                      autoComplete="current-password"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Password"
                      type="password"
                      value={field.state.value}
                    />
                    {fieldError ? (
                      <p
                        className="text-destructive text-xs"
                        id={`${field.name}-error`}
                      >
                        {fieldError}
                      </p>
                    ) : null}
                  </div>
                )
              }}
            </form.Field>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button disabled={!canSubmit || isSubmitting} type="submit">
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </Button>
              )}
            </form.Subscribe>
          </form>
          <Link
            className="text-center text-muted-foreground text-sm hover:text-foreground"
            to="/forgot-password"
          >
            Forgot your password?
          </Link>
          {cloud ? (
            <Link
              className="text-center text-muted-foreground text-sm hover:text-foreground"
              to="/signup"
            >
              New to keenpix? Create an account
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
