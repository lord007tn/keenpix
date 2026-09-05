# Acquisition measurement repair: public-safe verification

This is repository and synthetic browser evidence, not customer conversion,
production recovery, or an authenticated provider configuration audit.

## Confirmed causes

- Production Compose forwarded the direct GA4 ID but omitted the GTM ID.
- The Dockerfile runs `pnpm build:app` through Turbo. The original app-build dry
  run had no configured/inferred/passthrough environment variables, even with
  synthetic Google IDs set. Strict mode did not pass them to Vite.
- The public `https://keenpix.com/assets/index-CWjHlbwo.js` observed on this date
  embeds `VITE_APP_VERSION=0.3.2`, but neither Google ID. Conditional loader code
  exists; that is not evidence that a loader runs.
- The documented container's public script, fetched without execution at
  `https://www.googletagmanager.com/gtm.js?id=GTM-TFJ9TQDN`, returned HTTP 200.
  Its resource object had `version: "4"`, empty tags, predicates, and rules, and
  no GA destination ID was found. The resource field is not proof of an
  authenticated workspace/version or account ownership. An empty published
  resource is a separate integration dependency: supplying an ID cannot enable tags.
  Subsequent provider-owner inspection confirmed an existing Google tag detached
  from triggers for prior scanner remediation. Reuse that tag after current
  diagnostics/clearance; do not treat the public observation as proof that a new
  container or replacement tag is needed. The provider owner subsequently restored
  the existing native Google tag and published version 5; its public resource was
  independently verified with an initialization trigger and `send_page_view=false`.
  It still has no explicit GA4 event-forwarding tags.
- Initial views depended on Google's automatic behavior, while SPA views had a
  separate application owner. A rendered CTA test also reproduced an early-route
  effect reading the previous browser location. Tracking now observes TanStack's
  resolved location; a delayed-loader RouterProvider regression covers the boundary.
- `first_image_served` was emitted from an existing successful-delivery aggregate,
  not a unique first-delivery record. Its emission and dependent context-clearing
  branch were removed. No substitute canonical conversion was invented.

## Bounded changes and checks

The app-specific Turbo configuration forwards and hashes only the three public
variables already consumed by its Dockerfile. Existing dependency/output rules
are inherited, and no other package receives these variables. With synthetic
`G-LOCALTEST`, changing `GTM-LOCALTEST` to `GTM-SECONDTEST` changed the app build hash
from `f9a5f7373645117b` to `e8556c897c643e14` at the verification snapshot.
The actual `pnpm build:app` path subsequently embedded both configured IDs.

Production Compose now requires the GTM ID at build and runtime and does not
forward the direct fallback. `docker compose config` with synthetic placeholders
fails with exit 1 when GTM is missing. With GTM set, its rendered build/runtime
values match, and both direct-GA entries are absent. No Docker image was built.
Other deployments retain the documented mutually exclusive direct option.

Validation includes frozen install, Prisma generation, repository `pnpm health`,
and 23 focused analytics lifecycle tests. The full app suite has 110 files / 513
passing tests. After the last rendering adjustment, the focused tests, app
typecheck, lint, and actual Turbo app build were repeated. React Doctor's blocking
gate passes; nonblocking repository warnings are not claimed to be eliminated.
Docker CI remains manual-only.

Real Chromium rendered the built app at desktop and 390px mobile widths. Google
scripts/collectors were intercepted with empty responses and synthetic IDs; these
are application queue observations, not Google collection receipts. Checks cover
no loader before consent; one GTM loader and no independent direct commands with
both IDs present; initial/SPA/reload page views; comparison CTA to signup/login;
source persistence; privacy preferences and withdrawal. Queries/private test
markers do not appear in queued event properties. The current app declares
English/LTR; no Arabic/RTL localization is claimed.

The final analytics and legal suites pass 33 tests. Final desktop/mobile privacy
renders have no horizontal overflow, control overlap, or browser errors. Durable
PR evidence uses synthetic local configuration:

- [Desktop privacy](../../output/playwright/acquisition-measurement/desktop-privacy.png)
- [Mobile privacy](../../output/playwright/acquisition-measurement/mobile-privacy.png)
- [Mobile preferences](../../output/playwright/acquisition-measurement/mobile-preferences-open.png)
- [Preferences and withdrawal recording](../../output/playwright/acquisition-measurement/preferences-withdrawal.webm)

A separate fresh Chromium run used the actual public GTM version 5 and destination
scripts, with every collection/external endpoint blocked. The build included only
the managed GTM ID. Before consent: zero Google scripts or requests. After grant:
one GTM loader and its owned Google destination script; app `page_view` and
`acquisition_landing` objects were queued, but no collection attempts followed in
10 seconds. After withdrawal and navigation away, the already-loaded destination
attempted `user_engagement` at both `www.google-analytics.com/g/collect` and
`www.google.com/g/collect`. Both were blocked with HTTP 204, neither location
contained the private query marker, and there were zero page errors. This
demonstrates that consent-mode updates alone do not meet zero-after-withdrawal
collection, even with optional automatic event detections disabled. It is a
release blocker, not a production analytics receipt.

## Required provider and production work

The complete event/consent contract is in
[analytics-funnel.md](../../apps/docs/notes/analytics-funnel.md).

| Surface | Verified current state | Required before managed integration is complete |
| --- | --- | --- |
| Account/container/destination ownership | Provider owner reports authenticated verification of existing `GTM-TFJ9TQDN` and `G-C04VQED7GV` | Keep existing ownership/destination; this task did not authenticate or change provider settings |
| Published GTM resource | Public version 5 restored native Google tag; initialization only; no explicit event routes | Configure explicit sanitized custom-event triggers and prove collection |
| Consent | App queues default denied, then update granted before GTM bootstrap | Require analytics storage on every tag; ads stay denied; prove zero collection after withdrawal, including already-loaded Google behavior |
| Page views | Application owns consented initial and resolved SPA views | Disable Google initial auto view, Enhanced Measurement history views and duplicate GTM history triggers; map supplied location/referrer/title |
| Forms/custom events | Provider owner reports all six optional automatic detections and user-provided-data capabilities disabled | Forward only documented events/properties; verify propagated settings and no raw URL/referrer/form variables |
| Internal activity | Known operator/impersonated shell label, separate milestone keys | Inspect existing filter state first; use testing/report comparisons, not a destructive exclusion to hide unexplained traffic |
| OAuth/GA sessions | Local source persistence and callback-hint deduplication tested | Trace a real consented OAuth return and inspect GA attribution before any unwanted-referral change |
| First image | Unsupported browser conversion removed | Define a canonical eligible-delivery and idempotency contract before implementing any consent-safe join |

GTM's consent-update handling must also stop any automatic/cookieless sends from
an already-loaded Google destination. The direct compatibility option has a
destination disable flag; a managed container must implement and verify its own
destination/consent behavior. No blanket claim about remote tags follows from the
application's event guard.

Operational request logs, billing/outbox behavior, tenant/auth boundaries and
historical records are unchanged. HEAD can record successful transform work
without an image response body; prewarm disables logging; an ordinary public
preview/QA GET is indistinguishable from usage. These are not canonical activation
signals, and local tests do not turn them into such signals.

The provider owner must finish and verify the existing container before the reviewed
app is rebuilt with its real GTM ID and deployed. Then verify the deployed bundle,
initial/SPA/OAuth/consent collection receipts and internal classification. No
database migration is needed. Rollback restores the previous app image and the
previous verified provider configuration. The provider owner identifies GTM version
4 as container rollback; separate Google-tag setting changes require their own
rollback restoring the named prior switches. Retain all history and keep the former
first-image metric explicitly invalid if its old emitter returns.
