import dayjs from 'dayjs'
import { ArrowRightIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { BlogListItem } from '@/shared/blog-source'
import { SiteFooter, SiteHeader } from './blog-chrome'

function PostCard({ post }: { post: BlogListItem }) {
  return (
    <a
      className="group flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-ring/60 hover:bg-muted/40"
      href={post.url}
    >
      <img
        alt={post.coverAlt ?? post.imageAlt}
        className="aspect-[40/21] w-full border-b object-cover"
        height={630}
        loading="lazy"
        src={post.cover ?? post.image}
        width={1200}
      />
      <div className="flex flex-col gap-3 p-6 pt-5">
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
          <time dateTime={post.date}>
            {dayjs(post.date).format('MMMM D, YYYY')}
          </time>
          {post.competitor ? (
            <Badge variant="secondary">vs {post.competitor}</Badge>
          ) : null}
        </div>
        <h3 className="text-balance font-semibold text-lg leading-snug group-hover:text-primary">
          {post.title}
        </h3>
        <p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
          {post.description}
        </p>
        <div className="mt-auto flex items-center gap-1 pt-1 font-medium text-primary text-sm">
          Read more
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </a>
  )
}

export function BlogIndex({ posts }: { posts: BlogListItem[] }) {
  const comparisons = posts.filter((post) => post.competitor)
  const articles = posts.filter((post) => !post.competitor)

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Blog
            </span>
            <h1 className="mt-2 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              Image delivery, pricing, and the honest CDN.
            </h1>
            <p className="mt-4 max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed">
              Guides on image optimization, transparent managed-delivery
              pricing, and how Keenpix compares to the incumbents — from the
              team building the open-source engine.
            </p>
          </div>
        </section>

        {comparisons.length > 0 ? (
          <section className="border-b">
            <div className="mx-auto max-w-5xl px-6 py-14">
              <h2 className="font-semibold text-2xl tracking-tight">
                Keenpix vs the alternatives
              </h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Honest, side-by-side comparisons with the image CDNs you're
                probably evaluating.
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {comparisons.map((post) => (
                  <PostCard key={post.url} post={post} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section>
          <div className="mx-auto max-w-5xl px-6 py-14">
            <h2 className="font-semibold text-2xl tracking-tight">
              Latest articles
            </h2>
            {articles.length === 0 ? (
              <p className="mt-6 text-muted-foreground">
                No articles yet — check back soon.
              </p>
            ) : (
              <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {articles.map((post) => (
                  <PostCard key={post.url} post={post} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
