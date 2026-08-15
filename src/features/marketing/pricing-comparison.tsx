import { CheckIcon, MinusIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PlanPricing } from '@/lib/billing/plans'

const COMPETITORS = [
  {
    name: 'ImageKit Lite',
    href: 'https://imagekit.io/plans',
    featured: false,
    values: ['$9', '40 GB', '$0.50 / GB', 'Unlimited', '3 users', 'No'],
  },
  {
    name: 'imgix Starter',
    href: 'https://www.imgix.com/pricing',
    featured: false,
    values: [
      '$25',
      'Up to 100 GB',
      '$0.25 / credit',
      'Uses credits',
      'Not the billing unit',
      'No',
    ],
  },
  {
    name: 'Bunny Optimizer',
    href: 'https://bunny.net/pricing/optimizer/',
    featured: false,
    values: [
      '$9.50 / site',
      'CDN billed separately',
      'Varies by region',
      'Unlimited',
      'Not the billing unit',
      'No',
    ],
  },
] as const

const ROWS = [
  'Starting monthly price',
  'Included delivery',
  'Published delivery overage',
  'Transformations',
  'Team members',
  'Self-host option',
] as const

export function PricingComparison({ pricing }: { pricing: PlanPricing }) {
  const providers = [
    {
      name: 'Keenpix Basic',
      href: '/pricing',
      featured: true,
      values: [
        `$${pricing.plans.basic.month.amountCents / 100}`,
        '100 GB',
        `$${(pricing.plans.basic.overagePerGbCents / 100).toFixed(2)} / GB`,
        'Unlimited',
        'Unlimited',
        'Included',
      ],
    },
    ...COMPETITORS,
  ]
  return (
    <section className="border-b bg-background" id="compare-pricing">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <Badge variant="outline">Verified August 2026</Badge>
            <h2 className="mt-4 text-balance font-semibold text-3xl tracking-tight md:text-4xl">
              More delivery before the overage starts.
            </h2>
          </div>
          <p className="max-w-2xl text-muted-foreground leading-relaxed lg:justify-self-end">
            Keenpix stays focused on image optimization instead of bundling a
            DAM or video platform. That keeps the starting plan small, the
            managed-delivery allowance large, and the invoice readable.
          </p>
        </div>

        <p className="mt-8 text-muted-foreground text-xs sm:hidden">
          Swipe to compare every published plan →
        </p>
        <div className="mt-3 overflow-hidden rounded-xl border bg-card shadow-sm sm:mt-10">
          <div className="overflow-x-auto">
            <Table className="min-w-[880px]">
              <TableCaption className="sr-only">
                Published image optimization plan comparison
              </TableCaption>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-52">Published plan</TableHead>
                  {providers.map((provider) => (
                    <TableHead
                      className={
                        provider.featured
                          ? 'bg-primary/8 text-primary'
                          : undefined
                      }
                      key={provider.name}
                    >
                      <a
                        className="font-semibold underline-offset-4 hover:underline"
                        href={provider.href}
                        rel={
                          provider.href.startsWith('http')
                            ? 'noreferrer'
                            : undefined
                        }
                        target={
                          provider.href.startsWith('http')
                            ? '_blank'
                            : undefined
                        }
                      >
                        {provider.name}
                      </a>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROWS.map((row, rowIndex) => (
                  <TableRow key={row}>
                    <TableCell className="font-medium">{row}</TableCell>
                    {providers.map((provider) => {
                      const value = provider.values[rowIndex]
                      return (
                        <TableCell
                          className={
                            provider.featured
                              ? 'bg-primary/8 font-medium text-foreground'
                              : 'text-muted-foreground'
                          }
                          key={provider.name}
                        >
                          <span className="inline-flex items-center gap-2">
                            {value === 'Included' ? (
                              <CheckIcon className="size-4 text-primary" />
                            ) : null}
                            {value === 'No' ? (
                              <MinusIcon className="size-4" />
                            ) : null}
                            {value}
                          </span>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <p className="mt-4 max-w-4xl text-muted-foreground text-xs leading-relaxed">
          Public self-service prices checked against vendor-owned pricing pages
          on August 5, 2026. Products are not identical: ImageKit includes DAM
          and video capabilities, imgix uses shared credits, and Bunny charges
          its CDN separately. Taxes, annual discounts, enterprise contracts, and
          regional CDN charges are excluded.
        </p>
        <a
          className="mt-4 inline-flex font-medium text-primary text-sm underline-offset-4 hover:underline"
          href="/blog/best-image-cdns-2026"
        >
          Read the full 10-provider image CDN comparison
        </a>
      </div>
    </section>
  )
}
