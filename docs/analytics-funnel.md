# Acquisition-to-activation analytics

Keenpix Cloud loads either direct GA4 or Google Tag Manager only after explicit
analytics consent. The implementation respects Do Not Track, keeps advertising
storage and personalization denied, and sends no email, user, organization,
project, image, API key, full URL query, or full referrer values. Self-hosted
deployments leave `VITE_GA_MEASUREMENT_ID` and `VITE_GTM_CONTAINER_ID` unset and
receive no Keenpix product analytics.

Web Vitals uses this same consent state. Revocation updates Google Consent Mode
to denied, deletes first-party `_ga*` cookies on the Keenpix domain, and stops
future funnel and RUM sends immediately. An already-loaded Google script is not
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

1. Set `VITE_GA_MEASUREMENT_ID=G-C04VQED7GV` at both build time and runtime.
   Keep OAuth secrets server-only.
2. Direct GA4 is preferred and takes precedence if `VITE_GTM_CONTAINER_ID` is
   also set. To use GTM as a fallback instead, leave `VITE_GA_MEASUREMENT_ID`
   unset and use `VITE_GTM_CONTAINER_ID=GTM-TFJ9TQDN`. Its native Google tag is
   published, requires `analytics_storage` consent, and leaves ad signals
   disabled, but Google's automated scanner currently pauses it with a false
   positive. Direct GA4 therefore intentionally bypasses that provider-owned
   pause for production collection.
3. Mark `sign_up`,
   `project_created`, `first_image_served`, `begin_checkout`, and
   `subscription_activated` as key events in GA4.
4. Verify in GA4 DebugView (or GTM Preview when using the fallback) that a route
   change produces exactly one page view and each funnel action produces one
   event.
5. Do not infer conversion rates until enough real traffic has accumulated.

Configuration and script delivery do not prove that useful data has accumulated.
No traffic, Web Vitals baseline, or conversion rate is claimed at release time.

Search Console query data must be analyzed in aggregate. It cannot be joined to
an individual visitor or sent as an event parameter.

Client-side route changes send one `page_view` after consent. The event uses the
page title and an apex-origin URL containing only the pathname; query strings,
hashes, and router search state are intentionally excluded. Invitation tokens
and organization identifiers in admin paths are replaced with route labels.
