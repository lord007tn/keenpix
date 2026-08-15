# Keenpix launch readiness — August 15, 2026

Status: local release candidate validated; production deployment and external
account checks remain open.

## Local validation

- `pnpm vitest run`: 99 files and 452 tests passed.
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

## Live production observation

Observed on August 15, 2026 before deploying this release candidate:

- `https://keenpix.com/robots.txt` and `/sitemap.xml` return `200`.
- The live sitemap contains 60 URLs, no Arabic blog listing, and no language
  alternate links. This confirms the new sitemap is not deployed yet.
- `https://keenpix.com/blog/ar` returns `404`, confirming the Arabic release is
  not deployed yet.
- `https://keenpix.com/blog/` returns a temporary `307` to `/blog`. Host and
  scheme normalization is already a one-hop permanent `308`.
- A fresh 66-page SquirrelScan scored the undeployed live site 70/C: 5,926
  checks passed, 535 warned, and 91 failed. Its actionable docs schema,
  landmark, table-label, pricing-drift, and CSP findings are fixed in this
  release candidate. Cloudflare Email Address Obfuscation accounts for the
  reported `/cdn-cgi/l/email-protection` link failures and the token-shaped docs
  false positive; the repository contains ordinary public `mailto:` links and
  placeholders, not that generated value.

## Mandatory launch blockers

1. Revoke or rotate the API key that appeared in the public cutover record.
   The working tree is redacted, but the old value remains exposed in Git
   history and any public remotes until those are remediated.
2. Deploy the reviewed release candidate with an immutable Keenpix image and
   run the database migrations.
3. Configure and verify all production Cloudflare account/zone credentials,
   Polar production credentials and webhook, the production email provider,
   and cron health in Coolify. Do the equivalent validation against Polar
   sandbox in the staging deployment.
4. Change trailing-slash normalization at the proxy/platform layer from `307`
   to a permanent redirect. Disable Cloudflare Email Address Obfuscation for the
   intentionally public support address, then recheck `/blog/`, `/docs/`,
   `/pricing/`, and email links.
5. Verify the deployed sitemap, Arabic routes, canonical tags, `hreflang`,
   robots directives, health endpoints, usage reporting, and a real transform.
6. Submit the deployed sitemap in Google Search Console and monitor indexing,
   queries, and page exclusions after Google recrawls it.
7. Obtain explicit confirmation before creating a Keenpix X account, accepting
   terms, publishing posts, or making payout/security mutations.

The live SquirrelScan baseline is stored at
`output/keenpix-squirrelscan-live-2026-08-15.md`. Rerun it after deployment and
compare the live result; do not credit release-candidate-only fixes until that
post-deploy crawl passes.

## Prepared assets

- X header: `public/brand/raster/social/keenpix-x-header.png` (1500 × 500).
- Editable X header source: `public/brand/keenpix-x-header.svg`.
- English and Arabic article cards are generated from the repository's brand
  asset pipeline.
