# Keenpix launch readiness — August 15, 2026

Status: release deployed and live validation passed. Search Console resubmission,
credential rotation, public-history remediation, and brand X setup are complete.

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
- The founder's personal X profile is linked only to the founder Person entity.
  Keenpix's official brand profile is `https://x.com/getkeenpix`.

## Live production validation

Observed on August 15, 2026 after deploying current commit `59c8ab2`:

- `https://keenpix.com/api/health`, `/robots.txt`, and `/sitemap.xml` return
  `200`. The sitemap exposes 69 canonical URLs, five Arabic pages, and ten
  reciprocal English, Arabic, and `x-default` alternate sets.
- English and Arabic blog indexes and articles return `200`. Arabic documents
  render with `lang="ar"` and `dir="rtl"`; English documents retain
  `lang="en"` and `dir="ltr"`.
- All 47 unique advertised Open Graph, Twitter, and article images returned
  decodable images under fresh cache-busting. The five formerly failing English
  generator routes and representative Arabic routes returned uncached
  `200 image/png` responses after the deployment.
- The managed-cloud quickstart now uses the canonical
  `cdn.keenpix.com/p/YOUR_ID` path with an encoded source URL. The frameworks
  overview links directly to its slashless anchor, and the five materially
  revised blog/docs pages expose accurate `2026-08-15` sitemap modification
  dates.
- HTTP, `www`, and public trailing-slash variants use one-hop permanent `308`
  redirects. Query strings survive normalization.
- Global, docs, and blog missing routes return a real `404`, a dedicated
  not-found title, `noindex,nofollow`, no canonical, and an `X-Robots-Tag`
  noindex directive.
- Real managed image traffic returned `200`, the production usage cron completed
  with Cloudflare capture configured and no failures, and the deployment wrote a
  fresh PostgreSQL backup.
- The authenticated Polar production organization exposes the three founding
  products, three standard products, the private five-domain add-on, and one
  managed-delivery meter. Its required setup checklist is 7/7; revenue,
  subscriptions, orders, and available balance remain zero.
- The separate Polar sandbox now has the same seven active private products,
  three plan-credit benefits, and one `bandwidth_delivered` sum meter. The
  previously missing five-domain add-on was created, while the temporary product
  and meter used during verification were detached and archived. Polar confirms
  that sandbox changes do not process payments.
- The authenticated Zoho Mail account is a confirmed member of the
  `fariq@keenpix.com` group. No delivery test was sent and no mailbox, group,
  forwarding, or account-security setting was changed.
- Cloudflare Email Address Obfuscation is disabled by an active all-request
  configuration rule. Fresh uncached About, Support, and Privacy HTML contains
  native `mailto:` links and no `/cdn-cgi/l/email-protection` rewrites.
- The final 74-page SquirrelScan scored 77/C: 6,960 checks passed, 465 warned,
  and 71 failed. Links report zero errors and no unsafe external-link or orphan
  warning. The 71 failures are fully triaged as 46 false-positive decorative
  image-alt findings, 22 upstream Fumadocs mobile table-of-contents progressbar
  findings, and three transient TTFB readings that measured 189–309 ms on
  immediate repeated checks. The compact evidence record contains the complete
  classification and raw-report checksum.
- Search Console reports five clicks, 406 impressions, 1.2% CTR, and average
  position 34.7 for the current three-month window. Its indexing snapshot is
  dated August 7 and therefore predates this deployment: 41 URLs indexed and 19
  discovered but not yet crawled. The existing sitemap is successful and was
  resubmitted on August 15 and now reports 69 discovered URLs.

## Completed external actions

1. The exposed JoodCMS API key was replaced in production, verified through
   successful authenticated traffic, and disabled. The credential-bearing file
   was removed from every public branch and tag through an approved history
   rewrite.
2. `https://keenpix.com/sitemap.xml` was resubmitted successfully in Search
   Console. Priority indexing was requested for three English articles. Google's
   daily quota blocked the first Arabic request; retry it on August 16.
3. The official Keenpix X profile is live at `https://x.com/getkeenpix` with the
   brand avatar, header, website, and product description. No public post was
   created.
4. Polar production and sandbox catalogs were inspected in their authenticated
   dashboards. No payout, merchant-plan, balance, customer, subscription, or
   production-finance mutation was made.
5. The Keenpix support-group membership was verified in Zoho Mail without
   sending a message or changing mailbox state.

The tracked post-deploy evidence record is
`docs/releases/keenpix-live-audit-2026-08-15.md`. The full generated report is a
local operator artifact identified by filename and SHA-256 in that record.

## Prepared assets

- Canonical social avatar: `public/brand/keenpix-social-avatar.png`; this is the
  only supported social-profile avatar source.
- X header: `public/brand/raster/social/keenpix-x-header.png` (1500 × 500).
- Editable X header source: `public/brand/keenpix-x-header.svg`.
- English and Arabic article cards are generated from the repository's brand
  asset pipeline.
