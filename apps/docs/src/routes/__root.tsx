import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import styles from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    links: [{ href: styles, rel: 'stylesheet' }],
    meta: [
      { charSet: 'utf-8' },
      { content: 'width=device-width, initial-scale=1', name: 'viewport' },
      { content: 'Keenpix documentation', name: 'description' },
      { title: 'Keenpix docs' },
    ],
  }),
  shellComponent: Document,
})

function Document() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <RootProvider>
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  )
}
