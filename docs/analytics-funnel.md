# Acquisition-to-activation analytics

Keenpix Cloud loads Google Tag Manager (or direct GA4 as a fallback) only after explicit
analytics consent. The implementation respects Do Not Track, keeps advertising
storage and personalization denied, and sends no email, user, organization,
project, image, API key, full URL query, or full referrer values. Self-hosted
deployments leave `VITE_GA_MEASUREMENT_ID` and `VITE_GTM_CONTAINER_ID` unset and
send no Google acquisition or funnel analytics; their built-in product
analytics remains local to the deployment.

Revocation updates Google Consent Mode to denied, deletes first-party `_ga*`
cookies on the Keenpix domain, and stops future Google funnel sends immediately.
An already-loaded Google script is not
removed from the current document, but analytics storage remains denied; it is
not loaded on a later visit while consent remains denied.

## Funnel contract

| Stage | Data-layer event | Trigger | Parameters |
| --- | --- | --- | --- |
| Acquisition | `acquisition_landing` | First consented landing in the browser | path, referrer origin, sanitized UTM source/medium/campaign |
| CTA | `primary_cta_click` | Same-origin link to `/signup` | label, source path |
| Signup | `sign_up` | Email account creation or new Google account callback | method |
| Trial | `trial_started` | First observed `trialing` subscription | none |
| Project | `project_created` | Successful project creation | none |
| Activation | `first_image_served` | Dashboard first observes at least one request | none |
| Checkout | `begin_checkout` | Polar returns a checkout URL | plan, billing interval |
| Paid | `subscription_activated` | First observed active subscription | none |

Milestones are deduplicated per browser with consented local storage. This is a
measurement aid, not an authoritative billing ledger. Polar and the Keenpix
database remain authoritative for subscriptions and usage.

## GA4 and GTM configuration

Production uses the dedicated Google Analytics account `Keenpix` (`400817194`),
property `Keenpix Cloud` (`545156185`), web stream `15243494513`, and measurement
ID `G-C04VQED7GV`. The dedicated GTM account is `Keenpix` (`6365464774`) with
web container `keenpix.com` (`GTM-TFJ9TQDN`). These identifiers are public
configuration, not credentials, and are separate from other sites' accounts.

1. Set `VITE_GTM_CONTAINER_ID=GTM-TFJ9TQDN` at both build time and runtime only
   after the published container passes Preview and no tag is scanner-paused.
   The application prefers GTM when both public identifiers are present. Keep
   OAuth secrets server-only.
2. Configure the GTM container's Google tag for `G-C04VQED7GV`, require
   `analytics_storage`, disable advertising signals, and route the documented
   custom events to GA4. `VITE_GA_MEASUREMENT_ID=G-C04VQED7GV` remains a direct
   fallback only when GTM is unset.
3. Mark `sign_up`,
   `project_created`, `first_image_served`, `begin_checkout`, and
   `subscription_activated` as key events in GA4.
4. Verify GTM Preview and GA4 DebugView when GTM is configured; use GA4
   DebugView for the direct fallback. A route change must produce exactly one
   page view and each funnel action exactly one event.
5. Do not infer conversion rates until enough real traffic has accumulated.

Configuration and script delivery do not prove that useful data has accumulated.
No traffic baseline or conversion rate is claimed at release time. Cloudflare
Web Analytics, configured independently of Google, is the field-performance
source for LCP, INP, CLS, page-load, and page-view trends.

As of July 15, 2026, Google still scanner-pauses the native tag. Version 4 of
the container was published without firing triggers to request the supported
automated rescan. Production therefore omits the GTM public ID and keeps the
working, consent-gated direct GA4 collector until Google clears the container.

Search Console query data must be analyzed in aggregate. It cannot be joined to
an individual visitor or sent as an event parameter.

Client-side route changes send one `page_view` after consent. The event uses the
page title and an apex-origin URL containing only the pathname; query strings,
hashes, and router search state are intentionally excluded. Invitation tokens
and organization identifiers in admin paths are replaced with route labels.
