# Acquisition-to-activation analytics

Keenpix Cloud loads Google Tag Manager only after explicit analytics consent.
The implementation respects Do Not Track, keeps advertising storage and
personalization denied, and sends no email, user, organization, project, image,
API key, full URL query, or full referrer values. Self-hosted deployments leave
`VITE_GTM_CONTAINER_ID` unset and receive no Keenpix product analytics.

Web Vitals uses this same consent state. Revocation updates Google Consent Mode
to denied, deletes first-party `_ga*` cookies on the Keenpix domain, and stops
future funnel and RUM sends immediately. An already-loaded GTM script is not
removed from the current document, but analytics storage remains denied; GTM is
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

## GTM and GA4 configuration

1. Set the public `VITE_GTM_CONTAINER_ID` build variable to the production GTM
   container ID. Keep OAuth secrets server-only.
2. In GTM, add one GA4 Google tag for the production web data stream. Require
   `analytics_storage` consent and leave ad signals disabled.
3. Create custom-event triggers for the events above. Mark `sign_up`,
   `project_created`, `first_image_served`, `begin_checkout`, and
   `subscription_activated` as key events in GA4.
4. Enable History Change page views for TanStack Router navigation and verify in
   GTM Preview that a route change produces exactly one page view.
5. Do not infer conversion rates until enough real traffic has accumulated.

Search Console query data must be analyzed in aggregate. It cannot be joined to
an individual visitor or sent as an event parameter.
