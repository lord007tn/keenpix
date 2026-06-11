import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { RouteError } from '@/components/app/route-error'
import {
  getQueryContext,
  QueryProvider,
} from '@/lib/tanstack-query/root-provider'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryContext = getQueryContext()
  const router = createTanStackRouter({
    routeTree,
    context: queryContext,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
    Wrap: ({ children }) => (
      <QueryProvider queryClient={queryContext.queryClient}>
        {children}
      </QueryProvider>
    ),
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
