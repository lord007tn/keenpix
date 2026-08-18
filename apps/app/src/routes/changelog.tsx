import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ChangelogPage } from '@/features/marketing/changelog-page'
import { isCloud } from '@/server/deployment'
import { absoluteUrl, seo } from '@/shared/seo'
// Bundled at build time so the page always matches the shipped release, with no
// filesystem read at runtime.
import changelog from '../../../../CHANGELOG.md?raw'

const changelogMetaFn = createServerFn({ method: 'GET' }).handler(() => ({
  selfHost: !isCloud(),
}))

export const Route = createFileRoute('/changelog')({
  loader: () => changelogMetaFn(),
  head: ({ loaderData }) => {
    const canonicalUrl = absoluteUrl('/changelog')
    return {
      links: [{ rel: 'canonical', href: canonicalUrl }],
      meta: [
        ...seo({
          title: 'Keenpix Image CDN Product Changelog',
          description:
            'Every notable Keenpix release — new features, changes, and fixes for the image optimization engine and managed cloud, straight from the changelog.',
          url: canonicalUrl,
        }),
        ...(loaderData?.selfHost
          ? [{ name: 'robots', content: 'noindex,nofollow' }]
          : []),
      ],
    }
  },
  component: Changelog,
})

function Changelog() {
  return <ChangelogPage markdown={changelog} />
}
