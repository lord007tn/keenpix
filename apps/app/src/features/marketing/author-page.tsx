import { JsonLd } from '@/components/app/json-ld'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'
import { FOUNDER, SOCIAL_X_URL } from '@/shared/authors'
import { REPOSITORY_URL } from '@/shared/repository'
import { authorProfileJsonLd } from '@/shared/seo'

export function AuthorPage() {
  return (
    <div className="min-h-svh bg-background">
      <JsonLd data={authorProfileJsonLd()} />
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Author
            </span>
            <h1 className="mt-2 font-semibold text-4xl tracking-tight sm:text-5xl">
              {FOUNDER.name}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">{FOUNDER.role}</p>
          </div>
        </section>
        <section>
          <div className="mx-auto max-w-3xl px-6 py-14">
            <p className="text-lg leading-relaxed">{FOUNDER.bio}</p>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              Raed is accountable for Keenpix product articles and comparisons.
              His byline indicates product knowledge and editorial
              responsibility, not independent review of Keenpix. Competitor
              facts are checked against primary vendor sources; corrections are
              accepted through support.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 text-sm">
              <a
                className="font-medium text-primary hover:underline"
                href="/blog"
              >
                Articles by Raed
              </a>
              <a
                className="font-medium text-primary hover:underline"
                href="/methodology/comparisons"
              >
                Editorial methodology
              </a>
              <a
                className="font-medium text-primary hover:underline"
                href={REPOSITORY_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub repository
              </a>
              <a
                className="font-medium text-primary hover:underline"
                href={SOCIAL_X_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                X profile
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
