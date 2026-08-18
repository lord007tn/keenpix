# Keenpix public search and conversion audit

**Audit date:** 2026-08-18

**Production audited:** <https://keenpix.com>

**Scope:** technical SEO, content, schema, images, sitemap, international SEO, performance, visual/SXO, competitors, backlinks, GEO/AI visibility, analytics, and planning

**Evidence policy:** rankings, volumes, links, reviews, and customer outcomes are not inferred where first-party or provider data is unavailable.

## Executive decision

Keenpix has a sound crawlable, server-rendered foundation but a weak authority and demand-capture position. The live crawl found no critical crawl or indexability defect: every one of the 69 sitemap URLs returned `200`, exposed a single H1, an indexable robots directive, a self-canonical, and server-rendered content. The constraint is not another technical file. It is the combination of a young external entity, thin high-intent pages, limited search corroboration, an incomplete measurement baseline, and no provider-grade backlink data.

**Evidence-backed score: 79/100.** The independent whole-site crawler returned **77/C** (6,956 passes, 469 warnings, 71 failures). The difference reflects weighting: optional IndexNow and repeated third-party/decorative-image scanner findings are not given the same weight as crawlability, content, or conversion.

| Area | Score | Evidence-led assessment |
| --- | ---: | --- |
| Technical SEO | 88 | Strong SSR, canonicals, redirects, robots, sitemap, security, and real 404 handling; no critical blocker. |
| On-page | 82 | Complete basics across the sitemap; high-intent metadata and some documentation titles/descriptions needed work. |
| Content/E-E-A-T | 67 | Honest, source-dated comparisons are a strength; category, about, compare, and several framework pages are thin for their jobs. |
| Structured data | 88 | 52/69 live pages had valid JSON-LD and no parse errors; commercial comparison/self-host coverage was incomplete. |
| Performance | 72 | Lab-only mobile LCP ranged 3.70–4.67 seconds; no CrUX/field verdict was available. Desktop LCP was 1.29 seconds. |
| GEO/AI visibility | 68 | `llms.txt`, `llms-full.txt`, direct answers, and source-backed comparisons are good; third-party entity corroboration is the limiting factor. |
| Images | 93 | No missing dimensions, no missing alt attributes, no content image over 200 KB; responsive editorial variants remain an opportunity. |
| Backlinks | — | **INSUFFICIENT DATA**: fewer than four of seven health factors were available. |

## Product truth and positioning guardrails

Keenpix is a developer-focused image optimization and delivery SaaS with an AGPL-3.0 self-hosted engine. Managed customers connect existing S3, R2, or HTTP origins; request URL-based transforms; receive AVIF/WebP delivery, origin allowlists or signed URLs, analytics/logs, and custom-domain support. It is not a DAM, source-image library, or video platform.

The public managed plans are $9 for 100 GB, $29 for 400 GB, and $69 for 1 TB per month, with published delivery overages. The 14-day trial requires a card, allows up to two projects and 20 GB, and trial usage is not billed. Core audiences are frontend/platform engineers, technical founders, agencies, publishers, and content-heavy SaaS teams. The current market is global and USD-denominated. English is the product/documentation language; four editorial articles have Arabic translations. There is no local-business footprint.

Use these defensible positioning phrases:

- focused image transformation and delivery;
- bring your existing origin;
- transparent delivery meter and unlimited transforms;
- managed service with an AGPL self-host escape hatch.

Do not claim “cheapest,” universal speed or byte savings, enterprise scale, security outcomes, rankings, customer results, or review sentiment without workload-specific evidence.

## Technical evidence

- `https://keenpix.com` is canonical; HTTP apex and HTTPS `www` each make one `308` hop to it. Slash variants make one canonical redirect.
- The live sitemap contained 69 URLs. All 69 returned `200`, one H1, a meta description, index/follow, and one self-referencing HTTPS canonical.
- `/login` and `/signup` return `200` with `noindex,nofollow`; a synthetic missing URL returns a real `404` plus noindex directives.
- `robots.txt` allows the public site, disallows `/api/` and `/app/`, and declares the sitemap. It does not block the sampled AI crawlers.
- SSR is complete: initial HTML includes title, metadata, canonical, JSON-LD, H1, and body copy.
- English/Arabic blog indexes and four article pairs have reciprocal `en`, `ar`, and `x-default` hreflang in HTML and sitemap. Canonicals and language attributes align.
- The live site had 52/69 pages with parseable JSON-LD, zero JSON errors, and no deprecated schema types. The audit found an English/Arabic `Blog` entity ID collision and missing commercial-page schema; both are fixed in this change.
- 119 image instances represented 20 unique assets. No image lacked dimensions or an alt attribute; no content image exceeded 200 KB. The homepage hero AVIF was about 4.8 KB locally and was correctly eager, high-priority, and discoverable.
- Security evidence includes valid HTTPS, two-year HSTS with subdomains/preload, `X-Content-Type-Options`, `Referrer-Policy`, frame protection, and a minimal CSP. Expanding CSP directives is security hardening, not an SEO quick fix.
- Lighthouse 13.3 live homepage lab runs: mobile performance 84 (LCP 3.70 s, TBT 15 ms, CLS 0) and 72 (LCP 4.67 s, TBT 12 ms, CLS 0); desktop 93 (LCP 1.29 s, TBT 0, CLS 0). No INP or field verdict is claimed.
- Lighthouse estimated about 76 KB unused in the 198 KB main JavaScript payload and reported one render-blocking 21 KB CSS resource. It also reported three 3.33:1 card-label contrast failures, fixed here.
- Lighthouse reported a canonical audit discrepancy even though raw SSR HTML and the 69-URL crawl each found exactly one canonical. Validate this specific discrepancy in PageSpeed/GSC rather than removing a proven canonical.

## Page-by-page review

“Pass” means technically sound for the page's current job, not that the page is already competitive for generic search demand.

| Page(s) | Finding | Priority/action |
| --- | --- | --- |
| `/` | Strong direct answer and product model; description was 184 characters, illustrative 2.1 MB→480 KB example lacked a qualifier, consent covered mobile CTAs. | Fixed description, evidence label, trial language, consent footprint, and contrast. Reduce measured shared JS next. |
| `/pricing` | Clear meter and plan truth, but title/H1 omitted the explicit “image CDN pricing” intent. | Fixed title/H1. Build a workload calculator/dataset after measurement QA. |
| `/about` | Only 281 words and limited editorial/product-fact governance. | Added fact-maintenance/correction process and shortened description; add independently verifiable company evidence over time. |
| `/blog`, `/blog/ar` | Sound listing/indexing; English title was only 14 characters and Arabic description was short. | Fixed metadata. Maintain language-specific entity IDs. |
| `/authors/raed-bahri` | Useful ProfilePage/Person authorship signal. | Pass; add only verifiable credentials/work artifacts. |
| `/compare` | Correct intent but only about 373 words, no live schema, and weak category framing. | Expanded category/model guidance and added CollectionPage, ItemList, Breadcrumb schema. |
| Six existing `/compare/*` pages | Honest source/review dates and “when competitor wins” sections; no live page/breadcrumb schema. | Added WebPage/Breadcrumb schema. Preserve quarterly source verification. |
| `/compare/gumlet-alternative` | Missing despite high product/intent overlap. | Added a source-dated comparison with explicit workload math and fair Gumlet-win cases. |
| `/self-hosted-image-cdn` | Strong 1,600+ word hybrid commercial/technical page; no live JSON-LD. | Added SoftwareApplication, WebPage, and Breadcrumb schema. |
| `/methodology/comparisons` | Valuable trust page; schema absence is acceptable. | Pass; keep source, reviewer, correction, and quarterly SLA current. |
| `/security`, `/status`, `/support`, `/changelog` | Trust utilities are indexable and useful; several titles/descriptions were short. | Metadata fixed. Do not pad utility pages solely for word count. |
| `/legal/terms`, `/legal/privacy`, `/legal/dpa`, `/legal/license` | Correct public/legal function; several metadata fields were short. | Metadata fixed; no commercial schema needed. |
| `/docs` and section indexes | Crawlable, SSR, linked, valid breadcrumbs; many generated metadata fields were short. | Generated titles/descriptions now describe image-CDN docs while preserving each source page's title. |
| `/docs/concepts/analytics` | Valid concise concept doc. | Add event definitions and interpretation examples when product behavior changes. |
| `/docs/concepts/caching` | Important differentiator but concise. | Add cache-key, `Vary: Accept`, purge, and stale-behavior examples. |
| `/docs/concepts/how-it-works` | Supports category understanding. | Add an original request-lifecycle diagram and failure path. |
| `/docs/concepts/security`, `/docs/concepts/signed-urls` | Relevant technical trust content. | Link to the proposed SSRF/allowlist article and include rotation/failure examples. |
| `/docs/frameworks/nextjs` | Only 318 words live, short title/description; mixed implementation/commercial SERP intent. | Expanded in this change with loader, sizes, static export, security, validation, and cost/ownership guidance. Do not add a competing landing page without GSC evidence. |
| `/docs/frameworks/nuxt`, `/astro`, `/react` | High-value integration candidates but concise. | Deepen with runnable examples, framework caveats, failure modes, and test output in the next 60 days. |
| `/docs/frameworks/html`, `/remix`, `/sveltekit`, `/tanstack-start`, `/vue` | Useful documentation but unsafe as scaled SEO templates. | Keep manual. Expand only from demonstrated demand; require ≥40% unique content and real validation. |
| `/docs/getting-started/cloud-quickstart`, `/projects`, `/quickstart` | Strong post-click activation support. | Link more directly from matching public intent pages and instrument progress into first transform. |
| `/docs/reference/endpoint`, `/operations`, `/parameters`, `/responses`, `/sdk-api` | Appropriate reference intent; concise metadata fixed globally. | Pass; maintain exact product truth, examples, and stable anchors. |
| `/docs/self-hosting`, `/cdn`, `/configuration`, `/presets` | Supports the ownership differentiator. | Add capacity planning, observability, upgrades, and rollback evidence before creating more self-host pages. |
| Four `/blog/ar/*` articles | Correct reciprocal hreflang; three descriptions were short. | Metadata fixed. Expand Arabic only when GSC demand/engagement supports it. |
| `/blog/best-image-cdns-2026` | Strongest article: roughly 2,567 words, sourced table, byline, good list-intent match. | Preserve annual title accuracy and quarterly source checks; avoid unsupported “best” claims outside the stated criteria. |
| `/blog/what-is-an-image-cdn` | Correct informational intent but about 1,104 words and incomplete as the category pillar. | Expand to a task-complete 2,500–3,000-word pillar with original lifecycle diagram and spoke links. |
| `/blog/image-cdn-vs-traditional-cdn`, `/responsive-image-cdn-guide`, `/avif-vs-webp-production-caching` | Sound foundation/performance spokes. | Refresh with measurable examples and link to the pillar plus 2–3 sibling pages. |
| `/blog/nextjs-custom-image-cdn-loader`, `/signed-image-urls-hmac` | Useful implementation intent. | Keep distinct from docs through deeper explanation and explicit docs links. |
| `/blog/self-host-image-cdn-docker`, `/self-host-vs-managed-image-optimization` | Supports operational ownership intent. | Add capacity, monitoring, upgrade/rollback, and workload assumptions. |
| `/blog/transparent-image-cdn-pricing` | Supports buying intent without duplicating comparison landers. | Link to the future calculator/data file and all relevant comparisons. |
| `/blog/keenpix-vs-cloudinary`, `/keenpix-vs-imagekit`, `/keenpix-vs-imgix` | Pricing explainers are distinct from alternative landing pages. | Preserve scope; reverify published prices at least quarterly. |
| `/blog/joodcms-keenpix-integration` | Only current implementation proof candidate. | Convert to a jointly verified case study only with consent, workload, dates, method, and reciprocal disclosure. |

## Complete specialist applicability matrix

| Workflow | Status | Result or exact blocker |
| --- | --- | --- |
| audit | Applied | Fresh 74-page whole-site crawl: 77/C, 6,956 pass, 469 warning, 71 fail. |
| page | Applied | Representative commercial, editorial, trust, comparison, and documentation pages reviewed above. |
| technical | Applied | 88/100; no critical crawl/index blocker. |
| content | Applied | 67/100; thin high-intent hubs and external corroboration are primary gaps. |
| schema | Applied | Live graph parsed without errors; commercial coverage and localized Blog ID fixed. |
| images | Applied | 93/100; good dimensions/formats, responsive editorial variants remain. |
| sitemap | Applied | Valid 69-URL live XML, all URLs `200`, real lastmods, no priority/changefreq noise. |
| geo | Applied | 68/100; machine-readable files strong, entity authority weak. |
| performance | Applied, field blocked | Lighthouse lab captured; PSI 429 `defaultPerDayPerProject=0`, CrUX 403 unregistered caller. |
| visual | Applied | Mobile/desktop first viewport checked; consent obstruction and contrast fixed. |
| plan | Applied | 30/60/90 roadmap and KPI assumptions below. |
| programmatic | Conditional | Current framework set is small/manual. Do not scale until uniqueness, runnable proof, review, and rollout gates pass. |
| competitor-pages | Applied | Existing six reviewed; Gumlet added; imgproxy is next priority. |
| hreflang | Applied | Five Arabic pages and counterparts passed reciprocal/self/canonical validation. |
| local | Inapplicable | No NAP, GBP, service area, or location-page business model. |
| maps | Inapplicable | No physical/location discovery conversion path. |
| google | Blocked | No `google-api.json`, Google API key, OAuth/service account, default GSC property, or GA4 property access. |
| backlinks | Applied, insufficient | Common Crawl + auth checks only; no provider-grade link list. Score withheld. |
| cluster | Applied, precision blocked | Intent clusters built from live sampled SERPs; exact overlap/volume matrix blocked by DataForSEO absence. |
| sxo | Applied | 73/100; consent footprint fixed, intent/CTA pathways mapped, measurement still incomplete. |
| drift | Applied | Production baseline ID 1 exists from 2026-07-11; rebaseline only after this change deploys. |
| ecommerce | Inapplicable as business audit | Keenpix has no catalog/cart/merchant feed. E-commerce is a possible customer use case only. |
| firecrawl | Blocked | Firecrawl MCP/tool and credential were not available. |
| dataforseo | Blocked | DataForSEO MCP/tool and credential were not available; no volumes/rank estimates claimed. |
| image-gen | Applied as plan, generation not warranted | Existing OG coverage is complete and consistent; original factual diagrams/benchmark charts outrank decorative generation. Banana/image tool was unavailable. |
| flow | Applied | Find: crawl/measurement gaps; Lift: metadata/schema/SXO; Optimize: pillar/integrations; Win: authority assets and evidence-led distribution. |

## Competitor and SERP position

Sampled generic SERPs for “image CDN” and “image optimization CDN” mix authoritative education, vendor documentation, and commercial roundups. “Best image CDN” is crowded list intent. “Self hosted image CDN” surfaces GitHub projects, technical vendors, and community discussion. Keenpix did not appear in the sampled generic or brand/site search provider results. This is a directional snapshot, not a Google ranking or indexation audit.

| Competitor | Where it wins | Defensible Keenpix angle | Priority |
| --- | --- | --- | --- |
| Cloudinary | Broad image/video platform, DAM, AI, mature ecosystem. | Narrower bring-your-origin delivery and self-host option. | Existing page; quarterly verify. |
| imgix | Mature URL-processing layer and transform depth. | Simpler managed meter plus open self-host path. | Existing page; quarterly verify. |
| ImageKit | Upload/DAM/video plus bandwidth plans. | No forced media-library model; more focused delivery. | Existing page; quarterly verify. |
| Cloudflare Images | Native edge/storage/Workers integration and low-level platform fit. | CDN separation and different delivery-meter model. | Existing page; avoid universal savings claims. |
| Bunny Optimizer | Predictable per-site optimizer price plus regional CDN bandwidth. | Bundled image delivery, analytics, and self-host option. | Existing page; model total bandwidth. |
| Vercel Image Optimization | Default framework/platform integration. | Portability and explicit workload ownership. | Existing page; link to expanded Next.js doc. |
| Gumlet | Closest origin-friendly managed product with analytics and broad overlap. | Focused product, different included delivery, and self-host escape hatch. | Added now. |
| imgproxy | Mature, fast, security-focused self-hosted engine. | Managed dashboard/workspace option and one product path from managed to self-host. | Next comparison. |
| Small Pics | Simple challenger. | Monitor until feature and operating evidence justify comparison. | Watchlist. |
| Filebase Image Optimization | Strong current IPFS story. | Defer object-storage comparison until Filebase marks that capability live. | Watchlist. |

Primary sources used for claims: [Cloudinary pricing](https://cloudinary.com/pricing), [imgix pricing](https://www.imgix.com/pricing), [ImageKit plans](https://imagekit.io/plans), [Cloudflare Images pricing](https://developers.cloudflare.com/images/pricing/), [Bunny Optimizer pricing](https://docs.bunny.net/optimizer/pricing), [Gumlet LLM/product facts](https://www.gumlet.com/llm-info/), [Vercel pricing](https://vercel.com/pricing), and [imgproxy repository](https://github.com/imgproxy/imgproxy).

## Content clusters and editorial sequence

These are intent hypotheses to validate in GSC. They are not keyword-volume claims.

1. **Category pillar:** retain and expand `/blog/what-is-an-image-cdn` to a task-complete guide. It should define the category, show a request lifecycle, explain cache keys and format negotiation, distinguish managed/self-hosted models, and link every spoke.
2. **Foundations and performance:** keep the CDN comparison, responsive-images, and AVIF/WebP pages; add “image CDN cache keys and `Vary: Accept`” and a reproducible benchmark methodology.
3. **Implementation and security:** keep the Next.js loader and HMAC guides; add “origin allowlists and SSRF protection” and “Cloudflare cache rules for an image optimizer”; deepen Next.js, Nuxt, Astro, and React docs first.
4. **Ownership and operations:** add Keenpix vs imgproxy, self-host sizing (CPU/memory/cache), and image-CDN observability (hit rate, bytes, p95, errors).
5. **Buying and pricing:** ship an interactive workload calculator plus versioned data file, then a pricing-model explainer covering delivery, transforms, storage, and request meters.
6. **Use cases after proof:** headless CMS, product-catalog responsive pipelines, and framework-native pages only when each has real configuration, screenshots, constraints, and validated output.

Internal-link gate: the pillar links to every spoke; each spoke links back and to two or three siblings; the comparison hub links every comparison and methodology; pricing links calculator and comparisons; implementation content links the corresponding docs and the appropriate managed/self-host CTA. Require at least three incoming contextual internal links per indexable editorial/commercial page.

Programmatic gate: self-canonical, breadcrumbs, hub links, runnable setup, framework-specific caveats, screenshots/test output, at least 40% unique content, 5–10% human review, and releases of 10–20 pages rather than hundreds.

## Backlinks, community, and GEO/LLMO

The Common Crawl 2026 Jan–Mar web graph contained Keenpix but placed it below its reporting threshold; PageRank, harmonic centrality, host count, and referring domains were therefore null. No known link list existed for verification. By contrast, Cloudinary appears prominently in the same graph, which is useful only as directional evidence of a large authority gap—not as a comparable raw score or exhaustive domain count.

No outreach or external publishing was performed. The compliant acquisition sequence is:

1. Publish a versioned image-CDN pricing dataset/calculator and reproducible cache-key/format benchmark as linkable assets.
2. Improve GitHub repository topics, description, releases, and canonical site link; pursue Awesome Self Hosted or AlternativeTo only after meeting each directory's rules.
3. Ship framework-native loaders/examples and contribute them through accepted ecosystem processes.
4. Turn JoodCMS into a jointly verified technical case study with consent and reciprocal disclosure, not a link exchange.
5. Offer the benchmark/data to authors of current relevant roundups after it exists.
6. Share technical artifacts in relevant communities with explicit affiliation; do not mass-submit, buy links, or promise inclusion.

GEO work already has good raw material: direct-answer blocks, dated source tables, comparison methodology, author profile, `llms.txt`, and `llms-full.txt`. This change expands the machine-readable index to product, plans, comparisons, and trust resources. The next gain must be third-party corroboration and quotable original evidence, not another crawler file.

## Analytics and funnel measurement

The documented public funnel is home/blog/compare → pricing/signup → trial/onboarding → first project → first successful transform. Existing events include `acquisition_landing`, `primary_cta_click`, `sign_up`, `trial_started`, `project_created`, `first_image_served`, `begin_checkout`, and `subscription_activated`. This change adds a deterministic `content_group` (`home`, `pricing`, `self_hosted`, `comparison`, `editorial`, `documentation`, `trust`, `legal`, `authentication`, `product`, or `other`) to acquisition, page-view, and primary-CTA events so landing content can be tied to conversion without relying on brittle URL reports.

Required definitions for the first clean baseline:

- organic landing session;
- pricing view;
- signup start and completion;
- trial start;
- first project;
- first successful transform;
- organic landing → trial start and trial start → first transform.

The existing repository documentation records GA4 account `400817194`, property `545156185`, stream `15243494513`, measurement ID `G-C04VQED7GV`, and GTM container `GTM-TFJ9TQDN`. Those identifiers do not confer analytics access. Event QA and performance comparisons require property access and a clean 28-day baseline.

## 30/60/90 roadmap

Targets below are planning assumptions. Recalibrate after the first clean 28-day GSC/GA4 baseline.

| Window | Owner | Work | Dependency | Exit/KPI |
| --- | --- | --- | --- | --- |
| Days 0–30 | Growth/analytics engineer | Lock event definitions, content groups, organic funnel, GSC page/query groups, weekly cohort QA. | GSC/GA4 property access. | ≥95% event QA; baseline established. |
| Days 0–30 | SEO/content lead | Assign one intent per live URL; internal-link map; expand category pillar and refresh two spokes. | Editorial review. | 100% public URLs classified; zero intentional orphans. |
| Days 0–30 | Founder/product marketing | Approve positioning guardrails and comparison source owner. | Product sign-off. | 100% comparison pages have source, method, review date. |
| Days 0–30 | OSS maintainer | GitHub discoverability/release hygiene and benchmark/data specification. | Maintainer access. | Versioned asset spec ready. |
| Days 31–60 | Developer advocate + product engineer | Ship calculator/data file and reproducible benchmark; add imgproxy comparison. | Engineering review, reproducible harness. | Two linkable assets, one verified comparison. |
| Days 31–60 | Docs owners | Deepen Next.js, Nuxt, Astro, React with runnable examples, failures, tests. | Framework validation. | Four deep integration docs. |
| Days 31–60 | Founder/partnerships | Compliant directory/ecosystem inclusion and verified JoodCMS case study. | Rules, consent, evidence. | First five relevant verified referring domains target from baseline. |
| Days 61–90 | Content lead | Publish/refresh 4–6 spokes chosen from GSC impressions and assisted conversion. | Baseline data. | 6–8 total high-quality new/refreshed pages. |
| Days 61–90 | Founder/developer advocate | Artifact-led community launch and 1–2 consented implementation stories. | Linkable assets and customers. | Independently verifiable implementation evidence. |
| Days 61–90 | SEO engineer | Rebaseline drift after deploy; monthly sitemap/index/internal-link checks; assess Arabic demand. | Deployment + GSC. | Comparison SLA 100%; no uncontrolled programmatic batch. |

Longer planning assumptions:

- **3 months:** +20% non-brand GSC impressions; ≥90% intended public URLs indexed or individually diagnosed; five new relevant verified referring domains.
- **6 months:** +50% non-brand clicks; ten non-brand queries in the top 20 measured in GSC; +25% relative organic landing→trial-start conversion; 15 cumulative relevant referring domains; two verifiable cases.
- **12 months:** 2× non-brand clicks; 20 priority queries in the top 10; 30 cumulative relevant referring domains without one-domain dependency; 2× organic-attributed trial starts while first-transform quality holds at or above baseline.

## Implementation backlog

**Critical**

- Secure read access and owners for GSC/GA4; establish the clean funnel/index baseline.
- Preserve factual claim governance, source dates, workload assumptions, and quarterly comparison review.
- Assign one primary intent and accountable owner to every public route.

**High**

- Address the external authority deficit with linkable data/benchmark assets and real implementation proof.
- Expand the image-CDN pillar and thin high-intent hubs; enforce the contextual internal-link matrix.
- Publish the imgproxy comparison after primary-source verification.
- Reduce the measured shared/homepage JavaScript payload and repeat mobile Lighthouse.

**Medium**

- Deepen the four priority integration docs and add original diagrams/validation output.
- Add responsive 600/900/1200 editorial image variants where covers render substantially below 1200 px.
- Earn compliant directory/ecosystem placements and consented case studies.
- Consider controlled Arabic expansion only from measured demand.

**Low**

- Add IndexNow to the publish workflow after Bing tooling and key hosting exist.
- Improve immutable/versioned caching for remaining non-versioned brand/editorial assets.
- Monitor Small Pics, Filebase, and other challengers; publish only when overlap is verified.

## Changes implemented in this review

- Rewrote high-intent and short metadata, including homepage, pricing, blog, trust/legal utilities, Arabic listings, and generated documentation metadata.
- Added Gumlet to the comparison system with primary sources, explicit estimates, review dates, fair competitor-win cases, and no unsupported testimonials.
- Expanded the comparison hub and About page with product boundaries, decision categories, and fact-correction governance.
- Expanded the existing Next.js doc instead of creating an overlapping landing page.
- Added WebPage/Breadcrumb schema to comparison pages and self-hosted landing, plus CollectionPage/ItemList to the comparison hub.
- Fixed the Arabic Blog JSON-LD entity collision.
- Expanded `llms.txt`/`llms-full.txt` with product, plan, comparison, source-date, and trust resources.
- Labeled the homepage savings panel as illustrative, clarified trial/card language, improved card-label contrast, and compacted the consent UI without removing equal allow/decline choice.
- Added public `content_group` analytics dimensions and tests/documentation.

## Credentials, external changes, and blockers

- Google: missing `C:\Users\raedb\.config\codex-seo\google-api.json`, API key, OAuth token/service account, default GSC property, and GA4 property authorization. PSI returned HTTP 429 quota `defaultPerDayPerProject=0`; CrUX returned 403 for an unregistered caller.
- Moz: missing `MOZ_API_KEY` or `moz_api_key` in `C:\Users\raedb\.config\codex-seo\backlinks-api.json`.
- Bing Webmaster: missing `BING_WEBMASTER_API_KEY` or `bing_api_key` in the same config.
- Cloudflare analytics: the production RUM beacon is visible, but no API token, account ID, or zone authorization exists locally.
- DataForSEO and Firecrawl: no callable MCP tools or detected credential names.
- PostHog: no repository integration or connected property was found.
- No payment, deployment, production setting change, outreach, directory submission, external post, or self-merge was performed.
- The ignored `.seo-cache` contains the fresh local crawl and must remain uncommitted.

## Verification and release gate

- Whole-site live crawl: 74 pages sampled by the crawler; 69 sitemap URLs directly validated.
- Unit suite: 100 files, 457 tests passed.
- TypeScript/Fumadocs typecheck: passed after generating the local Prisma client.
- Biome formatting/lint: passed.
- Production build: passed; existing large-chunk warnings remain and support the High JavaScript-reduction backlog item.
- Rebaseline drift only after deployment, then compare every release. Do not overwrite the current production baseline before deploy.
