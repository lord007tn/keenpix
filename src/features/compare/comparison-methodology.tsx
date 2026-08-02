import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'
import { SUPPORT_EMAIL } from '@/shared/authors'

export function ComparisonMethodology() {
  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Editorial policy
            </span>
            <h1 className="mt-2 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              How Keenpix comparisons are researched
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Keenpix writes these pages and benefits if a reader chooses
              Keenpix. That conflict is disclosed on every comparison. The
              method below is designed to make the underlying facts inspectable
              and the recommendations appropriately narrow.
            </p>
          </div>
        </section>
        <section>
          <div className="prose mx-auto max-w-3xl px-6 py-14">
            <h2>Source order</h2>
            <ol>
              <li>
                Official pricing pages, product documentation, limits, and
                policies.
              </li>
              <li>
                Reproducible tests recorded with the account tier, date, inputs,
                and measured output.
              </li>
              <li>
                Third-party reports only when clearly attributed and not used as
                the sole basis for a decisive claim.
              </li>
            </ol>
            <p>
              Undocumented behavior is labeled “not publicly documented” rather
              than guessed. We do not publish customer ratings, review scores,
              market-share figures, or competitor performance benchmarks without
              an inspectable source.
            </p>
            <h2>Pricing comparisons</h2>
            <p>
              Each scenario states the usage assumptions and uses the public
              self-service price available on the verification date. Taxes,
              negotiated contracts, regional prices, legacy plans, and CDN
              cache-hit effects may change a real invoice. A scenario is an
              estimate, not a quote.
            </p>
            <h2>Product scope and licensing</h2>
            <p>
              We compare the specific product named on the page. A media
              platform, image optimizer, CDN feature, and self-hosted transform
              server are not interchangeable. Keenpix source licensing is
              described as AGPL-3.0 for the cloud release; readers should verify
              the license file for the version they deploy because older public
              branches may show a different license.
            </p>
            <h2>Review and correction policy</h2>
            <p>
              Commercial comparison facts are reviewed at least quarterly and
              after material vendor announcements. Pages show the date their
              sources were checked. Email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with a
              page URL, disputed statement, and primary source. Substantive
              changes update the article date; spelling-only edits do not.
            </p>
            <h2>What a verdict means</h2>
            <p>
              “Best for” is a fit judgment based on the criteria stated on the
              page, not a universal ranking. Every dedicated comparison must
              include situations where the competitor is the better choice and
              material Keenpix limitations.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
