# Acquisition measurement and its limits

Keenpix loads GTM, or direct GA4 when GTM is unset, only after analytics consent.
Do Not Track overrides a grant. Leave both public provider IDs unset where Google
analytics must not run. Advertising storage and personalization stay denied.
Application events exclude account/project/image identifiers, URL queries and
fragments, normalize private route identifiers, use generic account/admin titles,
and reduce external referrers to their origin.

## Counting contract

| Event | Boundary | Limit |
| --- | --- | --- |
| `page_view` | Initial consented render and subsequent pathname changes | Query-only changes are not new views; denied navigation is not replayed |
| `acquisition_landing` | First consented public landing in this browser | Not a GA session count; login/product/admin returns do not create a landing |
| `primary_cta_click` | Same-origin signup link click | A click is not a signup |
| `comparison_cta_click` | Annotated comparison link click | Public comparison/destination paths only |
| `sign_up` | Successful email signup response or Google new-user callback hint | Browser callback hint is not canonical account-creation evidence |
| `trial_started` | First browser observation of a trialing subscription | May observe an existing trial |
| `project_created` | Successful project creation response | Browser milestone, not the canonical project count |
| `begin_checkout` | Checkout URL returned | Not a payment |
| `subscription_activated` | First browser observation of an active subscription | Not a payment receipt or revenue ledger |

Milestones use consented local-storage keys. Reloads and repeated calls in the same
browser suppress repeats; this is not cross-browser, cross-user, or concurrent-tab
exactly-once delivery. A queued command is not a Google acknowledgment. Unavailable
storage fails closed for milestones. No configured provider consumes no milestone.
Internal activity uses separate keys so it cannot consume an ordinary milestone.

## Why there is no first-image conversion

The previous dashboard effect emitted `first_image_served` when aggregate
`successfulDeliveries` was positive. It could fire on an operator's browser,
after historical delivery, on another browser, or after a test request. It did not
identify a first project delivery. The effect and its exclusively dependent
attribution-cleanup branch were removed. Historical Google data and existing local
milestone keys are not deleted or relabeled.

Operational logs, rollups, outbox, tenant checks, and billing are unchanged. The
transform runtime logs after transformation/cache work. Its HEAD path can log
success without returning an image body. Authenticated prewarm uses
`recordLog: false`. A public GET used for preview or QA follows ordinary delivery
semantics; no existing signal distinguishes it from customer usage. A returned
response also does not prove that a person viewed the image.

No canonical first-image ledger or consent-safe project-to-Google join exists
here. Canonical activation idempotency and customer conversion cannot be asserted
or tested as if they exist. A future contract must define eligible projects and
requests, trusted QA/internal classification, successful-delivery acknowledgment,
a unique durable outcome key, retry behavior, and consent/lifetime rules before
adding a join. Do not reconstruct activation from historical aggregate counts.

## Source preservation and consent

The existing `keenpix.activation-context.v1` storage remains in use by signup,
project, and subscription milestones. A consented first public source survives
login, OAuth-return paths, and reloads. A comparison CTA may update the source.
Generic public reloads do not replace it or refresh its 30-day expiry. Withdrawal
clears it. No pre-consent journey is stored for later replay.

Only these public UTM sources are accepted: `google`, `bing`, `duckduckgo`,
`github`, `x`, `twitter`, `linkedin`, `reddit`, `producthunt`, `newsletter`.
Accepted media: `organic`, `referral`, `social`, `email`, `cpc`, `paid_social`.
They become campaign fields on the landing and attribution context on later browser
milestones. Arbitrary campaign text and unknown labels are omitted rather than
sent as potential personal data. Expand this public allowlist deliberately for new
channels; an omitted label is unknown.

First-party source preservation does not prove GA4 session attribution across
Google OAuth. Do not rewrite Google referrers or change unwanted-referral settings
without a consented round-trip trace demonstrating the actual behavior.

Withdrawal disables the configured destination and validated GA4 destinations
found in Google-owned loader URLs before updating Google Consent Mode,
clears first-party `_ga*` cookies and source context, and synchronizes the consent
component, including changes from another tab. Loaded scripts remain in the
document in other tabs to preserve unsaved edits. Explicit withdrawal from the
privacy-policy page reloads that page after disabling collectors and clearing
state, unloading the Google runtime. Regrant clears the destination disable flag
and measures only new consented activity. Remote GTM tags must obey consent
independently; this behavior must be reverified when provider tags change.

## Internal traffic and provider verification

Authenticated operator and impersonation flags mark the app shell as internal.
The admin shell is internal. Application events carry Google's supported
`traffic_type=internal`; no identity is sent. This is a reporting label, not an
authentication boundary. Anonymous staff visits and ordinary QA accounts remain
unclassified; do not infer identity from geography or behavior. Use an isolated
test property or block collectors for local synthetic QA.

Before release, inspect the actual GTM/GA4 configuration:

The intended managed deployment requires both `VITE_GTM_CONTAINER_ID` and
`VITE_GA_MEASUREMENT_ID` in production Compose at build time and runtime.
The documented container/destination are `GTM-TFJ9TQDN` / `G-C04VQED7GV`; these must
be verified against the existing provider account. Other deployments can retain
the mutually exclusive direct option. With both IDs present, GTM alone is loaded
by the application; the GA ID supplies explicit event routing and withdrawal
control, not another installation or config command.
A Google destination script loaded by GTM is not a competing application loader.

1. Require analytics consent for all tags. Verify no sends before grant and
   sanitized location/referrer/title. Destination disable and unloading prevent new
   measurement, but the actual native runtime can flush previously buffered events
   after withdrawal/pagehide. Strict zero post-withdrawal transmission remains
   unresolved; see the [timestamped verification](../../../docs/verification/acquisition-measurement-2026-09-05.md).
2. Both modes use standard Google `event` commands with the sanitized parameter
   object; the configured GA ID supplies `send_to`. The existing native GTM Google
   tag consumes these commands without custom-event tags or arbitrary data-layer
   mappings. Plain data-layer event objects and commands without an explicit
   destination did not route under the verified version 5 container. Direct GA4
   uses `send_page_view: false`; the GTM native tag must also disable its automatic
   initial view. Disable Enhanced Measurement
   browser-history views, automatic form interactions and duplicate history triggers.
   Do not route automatic form/input values or generic data-layer events. Use an
   explicit application event contract from the table above. Google documents that
   `send_page_view: false` alone does not disable history measurement:
   [manual page views](https://developers.google.com/analytics/devguides/collection/ga4/views).
3. Check initial load, SPA navigation, query-only updates, real OAuth return, reload,
   decline, grant, withdrawal, and regrant in Preview/DebugView. Confirm one collected
   view per eligible navigation and preserved source/session semantics.
4. Inspect existing internal filters before releasing this label. Prefer testing
   mode and report comparisons; an active exclusion permanently discards matching
   incoming data. Do not activate destructive filters or delete history to improve
   reports. See Google's [internal traffic guidance](https://support.google.com/analytics/answer/10104470).
5. Confirm consumers no longer treat historical `first_image_served` as verified
   activation. Record the rollout boundary without rewriting old data.

Local tests do not establish provider state, production recovery, customer
activation, or revenue. No database migration is needed. Release the reviewed app
revision after these provider checks. Rollback restores the prior app image;
retain all records and keep the old first-image metric explicitly invalid if the
former emitter is restored.
