# Keenpix launch readiness — August 15, 2026

Status: release deployed and live validation passed. Search Console resubmission,
the historical key incident, and the brand X account remain open.

## Local validation

- `pnpm vitest run`: 100 files and 454 tests passed.
- `pnpm typecheck`: passed.
- `pnpm check`: passed.
- `git diff --check`: passed.
- `pnpm build`: passed. Test files under `src/routes/` are excluded from route
  discovery, so they no longer generate false route warnings during builds.
- The globally preloaded client asset fell from 831,297 bytes raw / 265,137
  bytes gzip to 604,419 bytes raw / 189,725 bytes gzip (about 27% raw and 28%
  gzip). Docs and blog renderers are route-split, the private auth and Polar
  checkout graph is loaded only when private recovery needs it, and React Query
  is scoped to the authenticated app and admin layouts.
- Both cloud Compose definitions parsed successfully with non-secret validation
  placeholders and their newly required Cloudflare and Polar variables.

## Ready in the release candidate

- English and Arabic blog indexes, posts, reciprocal `hreflang`, locale-aware
  document metadata, and Arabic Open Graph cards.
- Draft posts and draft Open Graph routes fail closed; public 404 responses are
  non-indexable and retain real `404` status.
- Documentation emits honest `WebPage` schema instead of incomplete undated
  Article markup, exposes one skip-link-compatible main landmark, and gives
  product-comparison tables accessible names and header labels.
- Sitemap generation includes language alternates and all registered comparison
  routes.
- New managed checkout is standard pricing only. The first-25 founding offer is
  disabled until an atomic activation-time reservation design exists.
- Polar usage reporting uses settled immutable hours, durable delivery events,
  complete outbox draining, explicit capture coverage, conservative trial-to-
  paid watermarks, and retained attribution for deleted projects.
- Production and sandbox provider environments are explicit and fail closed on
  mismatched or incomplete configuration.
- Production Compose images are pinned instead of floating on `latest`.
- The application emits a non-breaking CSP baseline that restricts base URLs,
  object embedding, and framing. Restrictive script/style policies remain
  deferred until nonce and report-only coverage includes hydration, analytics,
  auth, and checkout.
- The founder's personal X profile is linked only to the founder Person entity;
  Keenpix does not claim an official brand X account before one exists.

## Live production validation

Observed on August 15, 2026 after deploying commit `dc0a72c`:

- `https://keenpix.com/api/health`, `/robots.txt`, and `/sitemap.xml` return
  `200`. The sitemap exposes 69 canonical URLs, five Arabic pages, and ten
  reciprocal English, Arabic, and `x-default` alternate sets.
- English and Arabic blog indexes and articles return `200`. Arabic documents
  render with `lang="ar"` and `dir="rtl"`; English documents retain
  `lang="en"` and `dir="ltr"`.
- HTTP, `www`, and public trailing-slash variants use one-hop permanent `308`
  redirects. Query strings survive normalization.
- Global, docs, and blog missing routes return a real `404`, a dedicated
  not-found title, `noindex,nofollow`, no canonical, and an `X-Robots-Tag`
  noindex directive.
- Real managed image traffic returned `200`, the production usage cron completed
  with Cloudflare capture configured and no failures, and the deployment wrote a
  fresh PostgreSQL backup.
- Cloudflare Email Address Obfuscation is disabled by an active all-request
  configuration rule. Fresh uncached About, Support, and Privacy HTML contains
  native `mailto:` links and no `/cdn-cgi/l/email-protection` rewrites.
- The final 74-page SquirrelScan scored 76/C: 6,917 checks passed, 510 warned,
  and 68 failed. Links now report zero errors. The remaining repeated hard
  failures are a Fumadocs mobile table-of-contents progress SVG without an
  accessible name; the scanner's secret-shaped documentation values are public
  examples/placeholders, not credentials.
- Search Console reports five clicks, 406 impressions, 1.2% CTR, and average
  position 34.7 for the current three-month window. Its indexing snapshot is
  dated August 7 and therefore predates this deployment: 41 URLs indexed and 19
  discovered but not yet crawled. The existing sitemap is successful and was
  last read August 15, but still reports the previous 60 discovered URLs.

## Remaining external actions

1. Revoke or rotate the API key that appeared in the deleted public cutover
   record, then remove it from public Git history and audit use. Working-tree
   redaction does not invalidate an exposed credential.
2. Resubmit `https://keenpix.com/sitemap.xml` in Search Console and request
   indexing for the highest-priority English and Arabic pages. Monitor the
   August 7 exclusions only after Google refreshes the report; the 18 redirect
   examples inspected are intentional `www` and HTTP canonicalization targets.
3. Create the Keenpix X brand account in the X mobile app. Desktop email signup
   is unavailable for this flow, and account creation and public posting require
   action-time approval.

The post-deploy SquirrelScan evidence is stored at
`output/keenpix-squirrelscan-live-final-2026-08-15.md`.

## Prepared assets

- X header: `public/brand/raster/social/keenpix-x-header.png` (1500 × 500).
- Editable X header source: `public/brand/keenpix-x-header.svg`.
- English and Arabic article cards are generated from the repository's brand
  asset pipeline.
