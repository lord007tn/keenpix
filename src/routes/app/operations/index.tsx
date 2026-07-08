import { createFileRoute, redirect } from '@tanstack/react-router'

// Operations moved into the operator /admin console. Keep this path as a
// permanent redirect so existing links/bookmarks still land in the right place.
export const Route = createFileRoute('/app/operations/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/admin' })
  },
  component: () => null,
})
