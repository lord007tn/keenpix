import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { NotFoundPage } from '@/components/app/error-page'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Devtools from '@/devtools/devtools'
import {
  absoluteUrl,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  seo,
} from '@/shared/seo'
import appCss from '../styles.css?url'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'application-name', content: SITE_NAME },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: 'en_US' },
      ...seo({
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        keywords: SITE_KEYWORDS,
        url: absoluteUrl('/'),
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'shortcut icon', href: '/favicon.ico' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      {
        rel: 'icon',
        href: '/favicon.ico',
        sizes: '64x64 32x32 24x24 16x16',
        type: 'image/x-icon',
      },
      {
        rel: 'icon',
        href: '/logo192.png',
        type: 'image/png',
        sizes: '192x192',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo192.png',
        sizes: '192x192',
      },
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'alternate', type: 'text/plain', href: '/llms.txt' },
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Static theme-color pair — kept out of route meta because HeadContent
            dedupes meta by name and would otherwise collapse the two variants. */}
        <meta
          content="#ffffff"
          media="(prefers-color-scheme: light)"
          name="theme-color"
        />
        <meta
          content="#07111f"
          media="(prefers-color-scheme: dark)"
          name="theme-color"
        />
        <HeadContent />
      </head>
      <body>
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:font-medium focus:text-primary-foreground focus:text-sm focus:shadow"
          href="#main-content"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors />
        </ThemeProvider>
        {import.meta.env.DEV ? <Devtools /> : null}
        <Scripts />
      </body>
    </html>
  )
}
