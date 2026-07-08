import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { MailCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPublicConfigFn } from '@/functions/config'
import { authClient } from '@/lib/auth/client'
import { signupSchema } from '@/schemas/auth'
import { noIndexPageHead } from '@/shared/seo'
import { getFieldError } from '@/utils/validation/form-errors'

// Self-serve sign-up is a cloud-only funnel. Self-host stays invite-only
// (operators add users from the admin surface), so redirect there off the cloud.
export const Route = createFileRoute('/(auth)/signup')({
  beforeLoad: async () => {
    const { cloud } = await getPublicConfigFn()
    if (!cloud) {
      throw redirect({ to: '/login' })
    }
  },
  head: () =>
    noIndexPageHead(
      'Create your account',
      'Create a Keenpix account to start optimizing and delivering images.',
    ),
  component: SignupPage,
})

function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onChange: signupSchema, onSubmit: signupSchema },
    onSubmit: async ({ value }) => {
      setError(null)
      const payload = signupSchema.parse(value)
      const { error: err } = await authClient.signUp.email({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        // Land verification success/failure on the branded /verify-email page
        // (which recovers expired links) instead of bouncing off /app to /login.
        callbackURL: '/verify-email',
      })
      if (err) {
        setError(err.message ?? 'Could not create your account.')
        return
      }
      // Cloud requires email verification before sign-in, so we don't land in the
      // app yet — show a "check your inbox" confirmation instead.
      setSentTo(payload.email)
      toast.success('Account created — check your email to verify')
    },
  })

  async function resendVerification() {
    if (!sentTo) {
      return
    }
    setResending(true)
    try {
      const { error: err } = await authClient.sendVerificationEmail({
        email: sentTo,
        callbackURL: '/verify-email',
      })
      if (err) {
        toast.error(err.message ?? 'Could not resend the email')
        return
      }
      toast.success('Verification email resent — check your inbox')
    } finally {
      setResending(false)
    }
  }

  return (
    <main
      className="relative flex min-h-svh items-center justify-center bg-muted/30 p-6"
      id="main-content"
    >
      <h1 className="sr-only">Create your keenpix account</h1>
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <KeenpixLogo className="mb-2" />
          <CardTitle>
            {sentTo ? 'Verify your email' : 'Create your account'}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {sentTo ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <MailCheckIcon className="size-8 text-primary" />
              <p className="text-muted-foreground text-sm">
                We sent a verification link to <strong>{sentTo}</strong>. Click
                it to activate your account, then sign in.
              </p>
              <Button
                disabled={resending}
                onClick={resendVerification}
                variant="outline"
              >
                {resending ? 'Resending…' : 'Resend verification email'}
              </Button>
              <div className="flex flex-col gap-1 text-muted-foreground text-sm">
                <button
                  className="hover:text-foreground"
                  onClick={() => setSentTo(null)}
                  type="button"
                >
                  Wrong email? Start over
                </button>
                <Link className="hover:text-foreground" to="/login">
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
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
                <form.Field name="name">
                  {(field) => {
                    const fieldError = getFieldError(field.state.meta)
                    return (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={field.name}>Name</Label>
                        <Input
                          aria-describedby={
                            fieldError ? `${field.name}-error` : undefined
                          }
                          aria-invalid={!!fieldError}
                          autoComplete="name"
                          autoFocus
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Ada Lovelace"
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
                <form.Field name="email">
                  {(field) => {
                    const fieldError = getFieldError(field.state.meta)
                    return (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={field.name}>Email address</Label>
                        <Input
                          aria-describedby={
                            fieldError ? `${field.name}-error` : undefined
                          }
                          aria-invalid={!!fieldError}
                          autoComplete="email"
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
                        <Label htmlFor={field.name}>Password</Label>
                        <Input
                          aria-describedby={
                            fieldError ? `${field.name}-error` : undefined
                          }
                          aria-invalid={!!fieldError}
                          autoComplete="new-password"
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="At least 8 characters"
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
                      {isSubmitting ? 'Creating account…' : 'Create account'}
                    </Button>
                  )}
                </form.Subscribe>
              </form>
              <Link
                className="text-center text-muted-foreground text-sm hover:text-foreground"
                to="/login"
              >
                Already have an account? Sign in
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
