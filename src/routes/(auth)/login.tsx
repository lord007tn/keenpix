import { useForm } from '@tanstack/react-form'
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
import { getFieldError } from '@/lib/form-errors'
import { loginSchema } from '@/schemas/auth'

export const Route = createFileRoute('/(auth)/login')({
  head: () => ({
    meta: [
      { title: 'Sign in - Keenpix' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
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
      const payload = loginSchema.parse(value)
      const { error: err } = await authClient.signIn.email(payload)
      if (err) {
        setError(err.message ?? 'Could not sign in.')
        return
      }
      toast.success('Signed in')
      navigate({ to: '/app/dashboard', search: { range: '30d' } })
    },
  })

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
        </CardContent>
      </Card>
    </main>
  )
}
