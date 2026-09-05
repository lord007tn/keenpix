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
  Plain data-layer event objects did not route to its native tag. Standard Google
  event commands without `send_to` also did not route. Explicit `send_to` using
  the existing destination did route without a second installation or new tags.
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
are inherited, and no other package receives these variables. At the final
snapshot, synthetic `GTM-LOCALTEST` / `G-LOCALTEST` hashed to `affc0c7cc0535f88`;
changing only GTM produced `d69b6b8fdf701516`, and changing only GA produced
`02b6e6af35de1085`.
The actual `pnpm build:app` path subsequently embedded both configured IDs.

Production Compose now requires both public IDs at build and runtime:
`VITE_GTM_CONTAINER_ID=GTM-TFJ9TQDN` and `VITE_GA_MEASUREMENT_ID=G-C04VQED7GV`.
The GA ID supplies event routing and withdrawal control; GTM alone installs and
configures Google. `docker compose config` with synthetic placeholders fails
with exit 1 when either ID is missing. Both rendered build/runtime pairs match.
No Docker image was built.
Other deployments retain the documented mutually exclusive direct option.

Validation includes frozen install, Prisma generation, repository `pnpm health`,
and 24 focused analytics lifecycle tests. The full app suite has 110 files / 514
passing tests. Full health was repeated after the final transport/withdrawal
changes, including lint, typecheck, tests, and build. React Doctor's blocking
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

The final analytics and legal suites pass 34 tests. Final desktop/mobile privacy
renders have no horizontal overflow, control overlap, or browser errors. Durable
PR evidence uses synthetic local configuration:

- [Desktop privacy](../../output/playwright/acquisition-measurement/desktop-privacy.png)
- [Mobile privacy](../../output/playwright/acquisition-measurement/mobile-privacy.png)
- [Mobile preferences](../../output/playwright/acquisition-measurement/mobile-preferences-open.png)
- [Preferences and withdrawal recording](../../output/playwright/acquisition-measurement/preferences-withdrawal.webm)

A separate fresh Chromium run used both actual public IDs and the public GTM
version 5/destination scripts, with every collection/external endpoint blocked.
GTM loading was delayed by 2.5 seconds. Before consent: zero Google scripts or
requests. After grant: one GTM loader and its owned Google destination script,
zero application `config` commands and no competing direct loader.

Observed application event sequence at `www.google-analytics.com/g/collect`:

1. `page_view` — `/compare/imgix-alternative`.
2. `acquisition_landing` — `/compare/imgix-alternative`.
3. `comparison_cta_click` — `/compare/imgix-alternative`.
4. `primary_cta_click` — `/compare/imgix-alternative`.
5. `page_view` — `/signup`.

The native runtime also generated `user_engagement` while granted and sent its
batched landing/CTA/SPA events to `www.google.com/g/collect`. Each application
event occurred once per observed collector, targeting `G-C04VQED7GV`. This is
native dual-host delivery, not a second app installation; processed GA4
deduplication remains unknown. Private query and unsaved-email markers were
absent from all intercepted requests. No browser errors were observed.

## Withdrawal: supported improvement and measured limit

The app now disables the configured and validated loaded GA4 destinations before
consent commands, clears cookies/context, and reloads explicit privacy-page
withdrawal to unload Google. Cross-tab withdrawal disables measurement without
reloading or losing an unsaved signup form. Regrant produces a fresh consented
view without replaying prior application events. The reloaded denied document
has no Google scripts or `_ga*` cookies.

These controls do **not** cancel every native buffered event. Shorter waits showed
zero post-withdrawal attempts; longer waits exposed already-generated views
flushing during pagehide despite `ga-disable=true`. A timestamped synthetic run
recorded the following relative to the decline click:

| Relative time | Observation |
| --- | --- |
| -6037 ms | `page_view` and `acquisition_landing` queued while granted |
| 0 ms | Decline click, destination disabled, denied stored, default/update denied queued |
| +1 ms | Consent component synchronized with denied and disable=true |
| +10 ms | Pagehide with denied and disable=true |
| +12 / +13 ms | Previously buffered `acquisition_landing` attempted via fetch at the two Google collectors; both intercepted |

No new application event was generated after denial in this trace or the denied
signup navigation. Another settled-page run captured previously buffered privacy
and second-tab signup views while current consent was denied. Thus stopping new
measurement is distinct from cancelling buffered transmission. Strict zero
post-withdrawal transmission remains unresolved. No shared fetch, XHR or beacon
API is replaced by this patch, and no production collection receipt is claimed.

## Required provider and production work

The complete event/consent contract is in
[analytics-funnel.md](../../apps/docs/notes/analytics-funnel.md).

| Surface | Verified current state | Required before managed integration is complete |
| --- | --- | --- |
| Account/container/destination ownership | Provider owner reports authenticated verification of existing `GTM-TFJ9TQDN` and `G-C04VQED7GV` | Keep existing ownership/destination; this task did not authenticate or change provider settings |
| Published GTM resource | Public version 5 native tag routes standard event commands with explicit `send_to` | Keep existing tag; verify deployed routing and processed counts, without adding duplicate event tags |
| Consent | Destination disable, denied updates and privacy reload stop new measurement; native prebuffered events can still flush | Strict zero buffered transmission remains an explicit unresolved acceptance gate |
| Page views | Application owns consented initial and resolved SPA views | Disable Google initial auto view, Enhanced Measurement history views and duplicate GTM history triggers; map supplied location/referrer/title |
| Forms/custom events | Provider owner reports all six optional automatic detections and user-provided-data capabilities disabled | Forward only documented events/properties; verify propagated settings and no raw URL/referrer/form variables |
| Internal activity | Known operator/impersonated shell label, separate milestone keys | Inspect existing filter state first; use testing/report comparisons, not a destructive exclusion to hide unexplained traffic |
| OAuth/GA sessions | Local source persistence and callback-hint deduplication tested | Trace a real consented OAuth return and inspect GA attribution before any unwanted-referral change |
| First image | Unsupported browser conversion removed | Define a canonical eligible-delivery and idempotency contract before implementing any consent-safe join |

No blanket claim about remote tags follows from the application's event guard.
Provider changes require renewed verification of routing, sanitization and consent.

Operational request logs, billing/outbox behavior, tenant/auth boundaries and
historical records are unchanged. HEAD can record successful transform work
without an image response body; prewarm disables logging; an ordinary public
preview/QA GET is indistinguishable from usage. These are not canonical activation
signals, and local tests do not turn them into such signals.

The provider owner must finish and verify the existing container before the reviewed
app is rebuilt with both real public IDs and deployed. Then verify the deployed bundle,
initial/SPA/OAuth/consent collection receipts and internal classification. No
database migration is needed. Rollback restores the previous app image and the
previous verified provider configuration. The provider owner identifies GTM version
4 as container rollback; separate Google-tag setting changes require their own
rollback restoring the named prior switches. Retain all history and keep the former
first-image metric explicitly invalid if its old emitter returns.
