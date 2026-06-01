import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { ThemeProvider } from '@/components/theme/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Devtools from '@/devtools/devtools'
import {
  absoluteUrl,
  BRAND_IMAGE_PATH,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
} from '@/lib/seo'
import appCss from '../styles.css?url'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: SITE_TITLE },
      { name: 'application-name', content: SITE_NAME },
      {
        name: 'description',
        content: SITE_DESCRIPTION,
      },
      { name: 'keywords', content: SITE_KEYWORDS },
      { name: 'theme-color', content: '#06101f' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: SITE_TITLE },
      { property: 'og:description', content: SITE_DESCRIPTION },
      {
        property: 'og:image',
        content: absoluteUrl(BRAND_IMAGE_PATH),
      },
      { property: 'og:image:alt', content: 'Keenpix modular image mark' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: SITE_TITLE },
      { name: 'twitter:description', content: SITE_DESCRIPTION },
      { name: 'twitter:image', content: absoluteUrl(BRAND_IMAGE_PATH) },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      {
        rel: 'icon',
        href: '/logo192.png',
        type: 'image/png',
        sizes: '192x192',
      },
      { rel: 'apple-touch-icon', href: '/logo192.png' },
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'alternate', type: 'text/plain', href: '/llms.txt' },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="font-semibold text-2xl">404</h1>
      <p className="text-muted-foreground">
        The requested page could not be found.
      </p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
