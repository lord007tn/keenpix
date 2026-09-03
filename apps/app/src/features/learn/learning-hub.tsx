import { ArrowRightIcon, BookOpenIcon, CheckCircle2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'
import {
  FEATURED_LEARNING_SLUGS,
  LEARNING_GUIDE_CLASSIFICATION,
  LEARNING_JOBS,
  LEARNING_PILLARS,
} from '@/shared/learning-content'

export interface LearningPost {
  description: string
  slug: string
  title: string
  url: string
}

export function LearningHub({ posts }: { posts: LearningPost[] }) {
  const bySlug = new Map(posts.map((post) => [post.slug, post]))
  const featured = FEATURED_LEARNING_SLUGS.map((slug) =>
    bySlug.get(slug),
  ).filter((post): post is LearningPost => Boolean(post))

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <Badge variant="outline">Keenpix Learn</Badge>
            <h1 className="mt-5 max-w-4xl text-balance font-semibold text-4xl tracking-tight sm:text-6xl">
              Clear answers for image delivery work.
            </h1>
            <p className="mt-5 max-w-3xl text-balance text-lg text-muted-foreground leading-relaxed">
              Start with the problem, not the product. These guides explain the
              architecture, measurements, security boundaries, and operational
              trade-offs you need to make a defensible decision.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-muted-foreground text-sm">
              {[
                'Neutral answer first',
                'Reproducible checks',
                'Limits and alternatives',
              ].map((item) => (
                <span className="inline-flex items-center gap-2" key={item}>
                  <CheckCircle2Icon className="size-4 text-primary" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
            <span className="font-medium text-primary text-sm">
              Featured answers
            </span>
            <h2 className="mt-2 font-semibold text-3xl tracking-tight">
              Start with the questions teams ask first
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featured.map((post) => (
                <a
                  className="group flex min-h-64 flex-col rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-ring/60 hover:bg-muted/40"
                  href={post.url}
                  key={post.slug}
                >
                  <BookOpenIcon className="size-5 text-primary" />
                  <h3 className="mt-5 text-balance font-semibold text-xl leading-snug group-hover:text-primary">
                    {post.title}
                  </h3>
                  <p className="mt-3 line-clamp-4 text-muted-foreground text-sm leading-relaxed">
                    {post.description}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-6 font-medium text-primary text-sm">
                    Read the answer
                    <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
            <span className="font-medium text-primary text-sm">
              Browse by job
            </span>
            <h2 className="mt-2 font-semibold text-3xl tracking-tight">
              What are you trying to do?
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {LEARNING_JOBS.map((job) => {
                const count = Object.values(
                  LEARNING_GUIDE_CLASSIFICATION,
                ).filter((classification) =>
                  classification.jobs.some(
                    (classificationJob) => classificationJob === job.id,
                  ),
                ).length
                return (
                  <a
                    className="rounded-xl border bg-background p-5 transition-colors hover:border-ring/60"
                    href={`#job-${job.id}`}
                    key={job.id}
                  >
                    <h3 className="font-semibold">{job.label}</h3>
                    <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                      {job.description}
                    </p>
                    <span className="mt-4 block text-muted-foreground text-xs">
                      {count} guides
                    </span>
                  </a>
                )
              })}
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              {LEARNING_JOBS.map((job) => {
                const jobPosts = posts.filter((post) =>
                  Object.entries(LEARNING_GUIDE_CLASSIFICATION).some(
                    ([slug, classification]) =>
                      slug === post.slug &&
                      classification.jobs.some(
                        (classificationJob) => classificationJob === job.id,
                      ),
                  ),
                )
                return (
                  <section
                    className="scroll-mt-24 rounded-xl border bg-background p-6"
                    id={`job-${job.id}`}
                    key={job.id}
                  >
                    <h3 className="font-semibold text-xl">{job.label}</h3>
                    <p className="mt-2 text-muted-foreground text-sm">
                      {job.description}
                    </p>
                    <ul className="mt-5 space-y-3">
                      {jobPosts.map((post) => (
                        <li key={post.slug}>
                          <a
                            className="group flex items-start justify-between gap-4 font-medium text-sm hover:text-primary"
                            href={post.url}
                          >
                            <span>{post.title}</span>
                            <ArrowRightIcon className="mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
            <span className="font-medium text-primary text-sm">
              Browse by topic
            </span>
            <h2 className="mt-2 font-semibold text-3xl tracking-tight">
              Follow a complete learning path
            </h2>
            <div className="mt-10 space-y-14">
              {LEARNING_PILLARS.map((pillar) => {
                const pillarPosts = posts.filter((post) =>
                  Object.entries(LEARNING_GUIDE_CLASSIFICATION).some(
                    ([slug, classification]) =>
                      slug === post.slug && classification.pillar === pillar.id,
                  ),
                )
                if (pillarPosts.length === 0) {
                  return null
                }
                return (
                  <section
                    className="scroll-mt-24 border-t pt-8 first:border-t-0 first:pt-0"
                    id={`topic-${pillar.id}`}
                    key={pillar.id}
                  >
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.5fr)]">
                      <div>
                        <h3 className="font-semibold text-2xl tracking-tight">
                          {pillar.title}
                        </h3>
                        <p className="mt-3 text-muted-foreground leading-relaxed">
                          {pillar.description}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {pillarPosts.map((post) => (
                          <a
                            className="group rounded-lg border bg-card p-5 transition-colors hover:border-ring/60"
                            href={post.url}
                            key={post.slug}
                          >
                            <h4 className="font-semibold leading-snug group-hover:text-primary">
                              {post.title}
                            </h4>
                            <p className="mt-2 line-clamp-3 text-muted-foreground text-sm leading-relaxed">
                              {post.description}
                            </p>
                            <span className="mt-4 inline-flex items-center gap-1 font-medium text-primary text-sm">
                              Read guide <ArrowRightIcon className="size-3.5" />
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
