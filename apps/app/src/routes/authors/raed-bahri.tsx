import { createFileRoute } from '@tanstack/react-router'
import { AuthorPage } from '@/features/marketing/author-page'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/authors/raed-bahri')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/authors/raed-bahri') }],
    meta: seo({
      title: 'Raed Bahri — Keenpix founder and maintainer',
      description:
        'Raed Bahri is the founder and maintainer of Keenpix and the accountable author for its product comparisons and image-delivery guides.',
      url: absoluteUrl('/authors/raed-bahri'),
    }),
  }),
  component: AuthorPage,
})
