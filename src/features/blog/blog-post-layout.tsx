import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'

export interface BlogPostMeta {
  author: string
  competitor?: string
  date: string
  description: string
  tags: string[]
  title: string
}

function formatDate(date: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return date
  }
  // Format in UTC so SSR and client agree — the dates are date-only strings
  // (UTC midnight), and a local timezone would shift the day and mismatch.
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function BlogPostHeader({ meta }: { meta: BlogPostMeta }) {
  return (
    <header className="border-b bg-muted/30">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <a
          className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          href="/blog"
        >
          <ArrowLeftIcon className="size-4" />
          All posts
        </a>
        {meta.competitor ? (
          <div className="mt-6">
            <Badge variant="secondary">Comparison · vs {meta.competitor}</Badge>
          </div>
        ) : null}
        <h1 className="mt-4 text-balance font-semibold text-3xl tracking-tight sm:text-4xl">
          {meta.title}
        </h1>
        <p className="mt-4 text-balance text-lg text-muted-foreground leading-relaxed">
          {meta.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground text-sm">
          <span>{meta.author}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={meta.date}>{formatDate(meta.date)}</time>
          {meta.tags.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {meta.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export function BlogPostCta() {
  return (
    <section className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-3xl flex-col items-start justify-between gap-6 px-6 py-12 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold text-2xl tracking-tight">
            Optimized images, minus the surprise bill.
          </h2>
          <p className="mt-2 text-muted-foreground">
            One honest price on bandwidth delivered. Or self-host the
            open-source engine, free.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <a
            className={buttonVariants({ variant: 'outline' })}
            href="/docs/self-hosting"
          >
            Self-host free
          </a>
          <Link className={buttonVariants()} to="/login">
            Get started
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </div>
      </div>
    </section>
  )
}
