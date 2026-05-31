import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

/** Shared Fumadocs layout options (nav title + links back into the app). */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Keenpix docs',
    },
    links: [
      { text: 'Dashboard', url: '/app' },
      { text: 'Home', url: '/' },
    ],
  }
}
