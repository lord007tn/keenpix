# Keenpix SEO command report index

Run date: 2026-07-10 to 2026-07-11  
Target: `https://keenpix.com` plus the local `cloud` codebase

This index distinguishes validated conclusions from deterministic wrapper output. Where a scanner produced a false positive, the validated report or the remediation roadmap is authoritative.

## Core audit commands

| Command | Outcome | Primary artifact |
|---|---|---|
| `/seo audit` | 78/100 raw; no true critical blocker after adjudication | `C:\Users\raedb\.codex\skills\seo\output\keenpix-com-audit-20260710-235016\FULL-AUDIT-REPORT.md` |
| `/seo page` | 88/100 adjusted; mobile overflow and trust proof are the main gaps | `output/page-keenpix-com-20260710-235358/VALIDATED-PAGE-ANALYSIS.md` |
| `/seo technical` | 88/100; duplicate `www`, redirect/header hardening, performance | `C:\Users\raedb\.codex\skills\seo\output\technical-keenpix-com-20260710-234856\TECHNICAL-AUDIT-REPORT.md` |
| `/seo content` | 60/100; About/proof/case-study/benchmark depth is the largest weakness | `C:\Users\raedb\.codex\skills\seo\output\content-keenpix-com-20260710-234924\CONTENT-AUDIT-REPORT.md` |
| `/seo schema` | ~82/100 adjusted; valid JSON-LD, incomplete pricing offer/entity model | `C:\Users\raedb\.codex\skills\seo\output\schema-keenpix-com-20260710-235343\SCHEMA-REPORT.md` |
| `/seo images` | 91/100 adjusted; article/editorial imagery is missing | `output/images-keenpix-com-20260710-235831/VALIDATED-IMAGES-AUDIT.md` |
| `/seo sitemap` | 98/100 adjusted; 49/49 clean, indexable, exact self-canonicals | `C:\Users\raedb\.codex\skills\seo\output\sitemap-keenpix-com-20260710-235534\SITEMAP-REPORT.md` |
| `/seo geo` | 68/100 validated; strong crawler/SSR access, weak independent citations | `output/geo-keenpix-com-20260711-000239/VALIDATED-GEO-ANALYSIS.md` |
| `/seo performance` | Mobile 70, desktop 93 lab medians; field CWV unavailable | `output/performance-keenpix-com-20260711-000005/PERFORMANCE-AUDIT-REPORT.md` |
| `/seo visual` | 85/100; confirmed 79px phone overflow and small touch targets | `output/visual-keenpix-com-20260711-000029/VISUAL-AUDIT-REPORT.md` |

## Strategy and architecture commands

| Command | Outcome | Primary artifact |
|---|---|---|
| `/seo plan SaaS` | Standard SaaS strategy pack and current site architecture | `output/plan-keenpix-com-20260711/SEO-STRATEGY.md` |
| `/seo programmatic` | 92/100 raw; current limited templates are healthy, avoid thin scaling | `output/programmatic-keenpix-com-20260711-000608/PROGRAMMATIC-REPORT.md` |
| `/seo competitor-pages` | Four existing pages validated; factual corrections precede expansion | `output/competitor-pages-keenpix-com-20260711-000835/VALIDATED-COMPETITOR-PAGES-PLAN.md` |
| `/seo cluster plan` | 15-keyword focused plan; 9 target pages, only 3 new pages | `output/cluster-image-optimization-cdn-20260711/cluster-plan.md` |
| `/seo sxo` | 61/100 SXO vs 78/100 SEO; page type aligned, trust/evidence gap | `output/sxo-keenpix-com-20260711/SXO-ANALYSIS.md` |
| `/seo flow` | Full Find/Leverage/Optimize/Win advisory cycle | `output/flow-keenpix-com-20260711/FLOW-REPORT.md` |

Framework and prompts © Daniel Agrici, CC BY 4.0 — github.com/AgriciDaniel/flow

## Applicability and international commands

| Command | Outcome | Primary artifact |
|---|---|---|
| `/seo hreflang` | 100/100 current state; correctly absent for a single English locale | `output/hreflang-keenpix-com-20260711-000846/HREFLANG-REPORT.md` |
| `/seo local` | Not applicable: global SaaS with no customer-facing location signals | `output/local-keenpix-com-20260711-000825/LOCAL-SUMMARY.md` |
| `/seo maps` | Tier 0 / not applicable; no map entity invented, zero credits | `output/maps-keenpix-com-20260711-001016/MAPS-SUMMARY.md` |
| `/seo ecommerce` | Not applicable to SaaS subscriptions/merchant marketplaces | `output/ecommerce-keenpix-com-20260711-001443/ECOMMERCE-SUMMARY.md` |

## Monitoring, Google, backlinks, and extensions

| Command | Outcome | Primary artifact |
|---|---|---|
| `/seo drift baseline` + `compare` | Pass with tooling caveat; 0 critical, 0 warning, 1 raw-hash info | `output/drift-keenpix-com-20260711/DRIFT-DEPLOYMENT-GATE.md` |
| `/seo google setup` | Credential tier -1; secure setup required | `output/google-setup-keenpix-com-20260711-001200/GOOGLE-SETUP-CHECKLIST.md` |
| `/seo backlinks` | Insufficient data (0/7); no numeric score or toxicity claims | `output/backlinks-keenpix-com-20260711-001317/BACKLINKS-SUMMARY.md` |
| `/seo dataforseo` | MCP unavailable/setup required; zero credit spend | `output/dataforseo-keenpix-com-20260711-001553/DATAFORSEO-SUMMARY.md` |
| `/seo firecrawl map` | MCP unavailable/setup required; native 49-URL evidence sufficient | `output/firecrawl-map-keenpix-com-20260711/FIRECRAWL-READINESS.md` |
| `/seo image-gen` | Banana/Gemini unavailable; six hero/OG briefs, 0 images, $0 cost | `output/image-gen-keenpix-com-20260711/IMAGE-GENERATION-PLAN.md` |

## False positives explicitly rejected

- The reported 49 canonical mismatches were parser artifacts; all 49 sitemap URLs are exact self-canonicals.
- Empty alt values are intentional decorative images with accessibility hiding; they are not missing meaningful alt text.
- The reported below-fold lazy-loading problems were not confirmed.
- Existing comparison pages were initially missed by a wrapper; the live hub and four pages exist.
- IndexNow is optional and is not a release blocker.
- The raw HTML hash in drift changed while title, description, canonical, robots, headings, schema hash, Open Graph fields, and status remained stable; it is informational only.

## Top-level deliverables

- `MIGRATION-PLAN-MASTER-TO-CLOUD.md`
- `SEO-REMEDIATION-ROADMAP.md`
- this command report index

## Known evidence gaps

- No GSC query/index-inspection or GA4 organic-conversion data.
- No CrUX field history; PSI quota returned 429 during lab work.
- No DataForSEO, Firecrawl, Moz, or Bing Webmaster data.
- No reliable backlink factor coverage.
- No paid image generation was performed.
- No local/Maps or merchant-marketplace entity applies to the current business model.
