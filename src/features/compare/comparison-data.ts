import { cloudinaryComparison } from './data/cloudinary'
import { imagekitComparison } from './data/imagekit'
import { imgixComparison } from './data/imgix'
import { vercelComparison } from './data/vercel'

export interface ComparisonPageData {
  competitor: string
  faq: Array<{ q: string; a: string }>
  featureRows: Array<{ feature: string; competitor: string; keenpix: string }>
  heroHeadline: string
  heroSubhead: string
  metaDescription: string
  migrationSteps: string[]
  pricingAsOf: string
  pricingRows: Array<{ scenario: string; competitor: string; keenpix: string }>
  slug: string
  sources: Array<{ label: string; url: string }>
  switchReasons: Array<{ title: string; detail: string }>
  title: string
  verdict: string
  whenCompetitorWins: string[]
}

// Registry keyed by URL slug. Keys are derived from each module's own slug so
// a page can never be served under a different path than its data declares;
// insertion order drives the hub listing and related-comparison links.
export const COMPARISONS: Record<string, ComparisonPageData> = {
  [cloudinaryComparison.slug]: cloudinaryComparison,
  [imgixComparison.slug]: imgixComparison,
  [imagekitComparison.slug]: imagekitComparison,
  [vercelComparison.slug]: vercelComparison,
}
