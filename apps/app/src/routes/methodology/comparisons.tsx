import { createFileRoute } from '@tanstack/react-router'
import { ComparisonMethodology } from '@/features/compare/comparison-methodology'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/methodology/comparisons')({
  head: () => ({
    links: [
      { rel: 'canonical', href: absoluteUrl('/methodology/comparisons') },
    ],
    meta: seo({
      title: 'Keenpix comparison methodology',
      description:
        'How Keenpix verifies competitor facts, calculates pricing scenarios, discloses conflicts, and corrects comparison pages.',
      url: absoluteUrl('/methodology/comparisons'),
    }),
  }),
  component: ComparisonMethodology,
})
