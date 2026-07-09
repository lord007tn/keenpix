import { createFileRoute, redirect } from '@tanstack/react-router'

// Operations moved into the standalone operator console at /admin/operations.
// Keep this path as a permanent redirect so existing links/bookmarks land right.
export const Route = createFileRoute('/app/operations/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/operations' })
  },
  component: () => null,
})
