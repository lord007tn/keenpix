import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import dayjs from 'dayjs'
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
import { acceptInvitationSchema } from '@/schemas/admin'
import { noIndexPageHead } from '@/shared/seo'
import { getFieldError } from '@/utils/validation/form-errors'

export const Route = createFileRoute('/invite/$token')({
  loader: ({ params }) => getInvitationFn({ data: { token: params.token } }),
  head: () =>
    noIndexPageHead(
      'Accept invitation',
      'Accept a private Keenpix workspace invitation and create your staff account.',
    ),
  component: InvitePage,
})

function InvitePage() {
  const invitation = Route.useLoaderData()
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const form = useForm({
    defaultValues: {
      token,
      name: '',
      password: '',
    },
    validators: {
      onChange: acceptInvitationSchema,
      onSubmit: acceptInvitationSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        const user = await acceptInvitationFn({ data: { ...value, token } })
        await authClient.signIn.email({
          email: user.email,
          password: value.password,
        })
        toast.success('Invitation accepted')
        navigate({ to: '/app/dashboard', search: { range: '30d' } })
      } catch (e) {
        setError(getErrorMessage(e, 'Could not accept invitation'))
      }
    },
  })

  const inactive =
    !invitation ||
    invitation.status !== 'pending' ||
    dayjs(invitation.expiresAt).isBefore(dayjs())

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
                e.stopPropagation()
                form.handleSubmit()
              }}
            >
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
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
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Your name"
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
                        minLength={8}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
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
                    {isSubmitting ? 'Joining...' : 'Join workspace'}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
