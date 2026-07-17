# Keenpix SEO remediation roadmap

Prepared: 2026-07-11  
Target: `https://keenpix.com` and the `cloud` codebase  
Business model: global image-optimization SaaS with managed cloud and self-hosted options

## Executive assessment

Keenpix has a strong technical SEO base and is ready to build authority. The raw full-audit score was 78/100, but several high-severity scanner findings were false positives. Manual and browser validation confirmed that all 49 sitemap URLs are self-canonical, decorative images correctly use empty alt text, below-fold image warnings were inaccurate, and the sitemap is complete and clean.

The highest-return work is not a broad rebuild. It is a focused sequence:

1. remove production hostname and mobile-layout ambiguity;
2. improve mobile performance and public-navigation ergonomics;
3. turn About/security/status/support content into verifiable trust infrastructure;
4. publish original benchmarks, case studies, and editorial visuals;
5. tighten metadata and commercial schema;
6. expand comparison/use-case content only through evidence-led templates;
7. connect Google and backlink data sources so future decisions use real impressions, field CWV, and referring-domain evidence.

## Validated scorecard

| Command | Result | Confidence and interpretation |
|---|---:|---|
| `/seo audit` | 78/100 raw | Useful baseline after removing false positives. No true critical blocker. |
| `/seo technical` | 88/100 | Strong crawl/index base. `www` duplicate host and security-header hardening remain. |
| `/seo page` | 88/100 adjusted | Homepage is well structured; mobile overflow and trust evidence are real gaps. |
| `/seo content` | 60/100 | Largest substantive weakness: thin company/proof content and limited authority signals. |
| `/seo schema` | ~82/100 adjusted | Valid JSON-LD; commercial offer coverage and entity modeling can improve. |
| `/seo sitemap` | 98/100 adjusted | 49/49 URLs return 200, are indexable, and self-canonical. |
| `/seo images` | 91/100 adjusted | Delivery is efficient; blog/editorial imagery is the real gap. |
| `/seo performance` | 70 mobile / 93 desktop | Lab medians. No field verdict because PSI/CrUX data was unavailable. |
| `/seo visual` | 85/100 | Strong desktop/tablet presentation; confirmed phone-width header overflow. |
| `/seo geo` | 80/100 scanner, ~68 evidence-adjusted | Excellent crawler access and `llms.txt`; weak independent brand/entity proof. |
| `/seo programmatic` | 92/100 raw | Current footprint is limited and healthy; do not scale thin templates yet. |

Scores from unavailable third-party data are intentionally not invented.

## P0 — release and canonical integrity

### Canonical hostname behavior

- Make `www.keenpix.com` return a permanent 308 redirect to `https://keenpix.com` instead of serving a second 200 copy.
- Prefer a 308 HTTP-to-HTTPS redirect after confirming proxy behavior; current behavior includes a temporary 302.
- Keep every public canonical, sitemap URL, Open Graph URL, and structured-data URL on the apex host.
- Keep the legacy API hostname directly proxied to cloud during migration; do not treat API-host routing as a marketing canonical redirect.

### Production regression gate

Before and after every production deployment, assert:

- `/`, `/pricing`, `/docs`, one blog article, `robots.txt`, and `sitemap.xml` return expected statuses;
- canonical URLs remain exact and unique;
- no accidental `noindex` appears;
- schema parses;
- `www` and HTTP variants redirect once to the apex HTTPS URL;
- mobile 320, 375, 390, and 412px layouts have no horizontal overflow.

## P1 — mobile experience and Core Web Vitals

### Header composition

The 375px page expands to 454px because the header combines a hamburger, full wordmark, theme toggle, and persistent signup CTA. The CTA is clipped and subsequent full-width sections inherit the wider canvas.

Recommended implementation:

- hide or shorten the header signup CTA below `sm`; the hero CTA remains visible above the fold;
- consider an icon-only compact brand at the narrowest widths;
- reduce narrow-screen horizontal padding and add `min-w-0` where a flex child can refuse to shrink;
- keep compact navigation through tablet or move full navigation to `lg`;
- fix the responsible composition rather than masking it with global `overflow-x-hidden`.

### Touch targets

Public navigation controls are commonly 32–36px high. Give hamburger, theme, drawer rows, and marketing CTAs a 44–48px hit area through public-nav-specific classes. Avoid globally inflating dashboard controls.

### Performance

Measured Lighthouse medians:

- mobile: 70, FCP 4.4s, LCP 4.8s, TBT 30ms, CLS 0;
- desktop: 93, LCP 1.3s.

Priorities:

1. reduce the render-blocking global CSS/font chain (estimated ~450ms opportunity);
2. split/defer non-critical client JavaScript; initial JS was ~322KiB with ~121KiB estimated transferable unused code;
3. validate whether theme/navigation code can ship later or more selectively;
4. add first-party `web-vitals` RUM, since the package is already present;
5. capture LCP, INP, and CLS by route/device after sufficient traffic; lab data must not be labeled as field CWV.

## P1 — trust, evidence, and content quality

### Company and trust hub

Expand `/about` from a thin company statement into a verifiable credibility hub:

- named founders/team or accountable maintainer identity;
- relevant experience and role descriptions;
- company/legal identity and contact/support path;
- editorial/benchmark methodology;
- links to security, privacy, DPA, status, changelog, GitHub, and documentation;
- real operational claims only—no fabricated customer counts, ratings, or certifications.

Create or strengthen public `/security`, `/status`, and `/support` surfaces. State data handling, deployment options, incident/contact process, and residency only where verified.

### First-party evidence

Publish at least one rigorous benchmark and one customer/use-case case study before accelerating generic blog output. Each should include:

- test setup and reproducible methodology;
- source assets, formats, device/network assumptions, and dates;
- results tables and limitations;
- author/reviewer identity and update date;
- a concise 100–170 word answer-first block that can stand alone in search/AI citations;
- a downloadable or inspectable evidence artifact where feasible.

### Existing content

- Deepen the five short blog posts (roughly 465–608 words) with original examples, methodology, citations, screenshots/diagrams, and update dates.
- Keep the strong 2,400+ word image-CDN guide as the quality reference.
- Expand the docs landing page and About/privacy pages where the user's decision depends on clarity, not to satisfy an arbitrary word count.
- Add author/byline pages or durable author anchors and connect Article schema to them.

## P1 — schema and metadata

### Pricing/offers

- Represent all six real pricing combinations, including monthly and annual billing intervals.
- Use numeric `offerCount`, not a string.
- Connect Organization, WebSite, WebPage, SoftwareApplication, OfferCatalog/Offer, and author entities through stable `@id` values.
- Prefer a WebPage with a SoftwareApplication/OfferCatalog `mainEntity` when that models the page more accurately than a generic Product.
- Do not add ratings/reviews or Product-review rich-result fields unless genuine visible evidence exists.

### Search snippets

- Rewrite the 6 titles above ~60 characters and 9 descriptions above ~160 characters based on search intent, not mechanical truncation.
- Keep one clear value proposition and next action per commercial snippet.
- Review metadata quarterly and after product/price changes.

### Sitemap

- Keep the current complete 49-URL coverage and exact self-canonicals.
- Remove ignored `changefreq` and `priority` fields if they add maintenance noise.
- Add truthful `lastmod` only from durable page/article update data; never stamp build time across all URLs.
- Add tests comparing sitemap membership, status, indexability, and canonical equality.

## P1 — image and social strategy

The homepage image pipeline is efficient: the hero AVIF is about 96% smaller than its PNG fallback, images have dimensions, and no oversized rendered asset was found.

Actions:

- create original visible 1200×630-or-larger editorial hero images for all six blog posts and the listing experience;
- use each article's visual as its article-specific OG image instead of a universal brand card;
- include topical, descriptive alt text for meaningful editorial images;
- version dynamic OG URLs or relax slug-stable one-year immutable caching so updated cards do not remain stale;
- visually verify whether the existing ~75KiB JPEG can replace the ~170KiB generic OG PNG;
- remove or regenerate the unused ~1MiB brand icon and review duplicate aliases as deployment-size cleanup, not page-speed emergencies.

## P2 — SaaS information architecture

Preserve the strong current docs/blog/compare foundation, then add pages only when each has a distinct intent and evidence base:

```text
/
├── /features
│   ├── /image-transformation-api
│   ├── /automatic-format-and-quality
│   ├── /signed-urls
│   └── /analytics
├── /solutions
│   ├── /nextjs-image-optimization
│   ├── /astro-image-optimization
│   ├── /self-hosted-image-cdn
│   └── /managed-image-cdn
├── /integrations
│   ├── /cloudflare
│   ├── /s3-compatible-storage
│   └── /framework pages only where integration behavior is real
├── /customers
│   └── /case-studies/{customer-or-use-case}
├── /benchmarks
├── /security
├── /status
└── /compare
    ├── /cloudinary-alternative
    ├── /imagekit-alternative
    ├── /imgix-alternative
    └── other pages only after SERP and factual-product research
```

Every scalable page family needs a unique data source, meaningful template variance, human review, self-canonical URLs, strong internal links, and a noindex/stop rule when content does not clear the quality gate.

### Approved first content cluster

Keep the homepage as the single category/conversion pillar for `image optimization CDN`, `image CDN`, and `image optimization service`. Do not add a duplicate `/image-optimization-cdn` page.

The focused cluster reuses six existing targets and proposes only three new informational pages:

- `/blog/what-is-an-image-cdn` (merge “what is” and “how it works” intent);
- `/blog/image-cdn-vs-traditional-cdn`;
- `/blog/responsive-image-cdn-guide`.

Reuse `/self-hosted-image-cdn` for both self-hosted and open-source intent. Validate priorities with GSC and a reproducible US SERP export before consolidation or redirects; current search evidence did not provide dependable numeric overlap or volume data.

### Search-experience opportunity

The homepage's hybrid commercial/educational page type aligns with the current mixed SERP. Its 61/100 SXO score is held back mainly by the risk-aware production buyer: add a production-readiness proof block, reproducible benchmark, framework-specific quick paths, a concise answer-first definition, and a no-login interactive demo/calculator if product scope supports it.

## 30/60/90-day delivery plan

### Days 0–30: protect and repair

- Complete the cloud migration rehearsal and production cutover gates.
- Fix `www`/HTTP redirects.
- Fix narrow-mobile header overflow and public touch targets.
- Reduce CSS/font blocking and split non-critical JS.
- Add RUM and SEO drift baseline/compare to deployment checks.
- Correct pricing offers, entity connections, long titles/descriptions, and sitemap maintenance fields.
- Expand About and publish security/status/support basics.

### Days 31–60: prove and explain

- Publish one original image-delivery benchmark.
- Publish one genuine case study or transparent internal use-case study.
- Upgrade five thin blog posts with first-party evidence and editorial images.
- Add article-specific OG images and byline/author connections.
- Build 2–4 high-intent feature/solution pages from validated search intent.
- Configure Google Search Console, CrUX/PSI, and GA4 access; establish actual query and field-CWV baselines.

### Days 61–90: expand with evidence

- Refresh existing comparison pages against verified current competitor facts.
- Add only the highest-confidence missing comparison/use-case pages.
- Build a SERP-overlap content cluster around image optimization/CDN/API intent.
- Start digital PR around benchmark data, open-source engineering, and reproducible performance findings.
- Establish backlink/brand-mention monitoring and AI citation checks when integrations are available.

### Comparison-page corrections before expansion

The live site already has a comparison hub plus Cloudinary, Imgix, ImageKit, and Vercel alternative pages. A scanner claim that no comparison pages existed was false.

- Correct the Vercel page's “No 402s” claim: Keenpix also returns 402 when a user's cap is reached.
- Add visible primary-source citations and an “information verified on” date to every feature/pricing table.
- Reconcile public AGPL messaging with the GitHub default `master` view that still presents Apache licensing; inconsistent licensing claims damage trust.
- Add a comparison methodology/disclosure block and recurring factual-review ownership.
- After current pages are corrected, research Cloudflare Images and Bunny Optimizer first, then self-hosted imgproxy intent. Do not publish a page until the competitor facts and search intent are validated.

## Measurement framework

Track outcomes by page family, not only site-wide sessions:

- non-brand impressions/clicks and position by feature, docs, comparison, and blog;
- organic signup/trial and pricing-to-signup conversion;
- blog/docs assisted conversions;
- mobile LCP/INP/CLS from RUM and CrUX where available;
- indexed canonical URL count and sitemap errors;
- referring domains and links to benchmarks/case studies;
- branded search growth and independent brand mentions;
- AI-crawler access, citations/mentions, and passage-level citation tests;
- comparison-page factual review freshness.

## Integration gaps limiting this audit

- Google credentials are not configured: no Search Console query/index inspection, GA4 organic behavior, or reliable CrUX history was available.
- PageSpeed API requests hit HTTP 429 during performance work; field metrics were not inferred from lab data.
- DataForSEO MCP is not installed: no paid SERP volumes, keyword difficulty, Maps grids, live backlink profile, marketplace data, or LLM mention tracking.
- Firecrawl MCP is not installed; the built-in crawler and 49-URL sitemap were used instead.
- Moz and Bing Webmaster backlink credentials are not configured; Common Crawl alone cannot support a confident backlink score.
- Keenpix is a global SaaS with no verified local-business signals, so GBP/NAP/maps work is not currently an applicable growth track.
- Keenpix is not an e-commerce/catalog store; Google Shopping/Amazon product-listing analysis is not applicable to its SaaS plans.

## Definition of done

The first remediation phase is complete when:

- canonical host redirects and deployment drift checks pass;
- no supported phone viewport horizontally overflows;
- public touch targets meet the chosen 44–48px standard;
- mobile lab performance improves and field RUM is collecting real data;
- pricing/schema metadata reflects actual offers;
- About/security/status/support establish verifiable trust;
- one benchmark and one case study are published with original visuals;
- Google/Search Console/GA4 access is connected;
- a post-deployment full audit confirms no critical regression.
