import {
  QueryClient,
  type QueryClientConfig,
  QueryClientProvider,
} from '@tanstack/react-query'
import type { ReactNode } from 'react'

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
}

export function getQueryContext() {
  return {
    queryClient: new QueryClient(queryClientConfig),
  }
}

export function QueryProvider({
  children,
  queryClient,
}: {
  children: ReactNode
  queryClient: QueryClient
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
