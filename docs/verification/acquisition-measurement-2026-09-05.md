# Acquisition measurement verification

This change repairs public analytics build inputs, consent synchronization and
initial/SPA page-view timing. GTM installs Google when configured; the GA4
destination supplies explicit event routing and withdrawal control. The app does
not add a second loader. The unsupported historical-aggregate
`first_image_served` emitter is removed.

## Validation

- Repository health checks passed at the reviewed implementation head, including
  lint, typecheck, tests and build. The app suite passed 514 tests across 110 files;
  focused analytics/legal checks passed 34 tests.
- A RouterProvider regression covers settled navigation. Synthetic browser checks
  cover consent, page views, comparison links, source persistence and query
  redaction. These checks do not establish processed analytics or customer usage.
- Compose validation checks both public IDs at build/runtime. Turbo hashes and
  forwards the inputs. No Docker image was built; image builds remain manual.
- No database migration is required.

## Known limitations

Withdrawal stops new application events and disables configured destinations.
Google's runtime may still transmit events buffered while consent was granted,
including during pagehide. Strict zero transmission after withdrawal is not
established. Withdrawal updates consent in place without forcing reload or
pagehide. Destination disable must not be described as cancelling all buffered
requests. A DOM regression checks the actual Decline click, destination disabling,
denied consent, suppression of subsequent page events and absence of reload.

Browser milestones are not canonical business records. There is no first-image
activation ledger or consent-safe project-to-analytics join. A queued event is
not proof of collection, activation or payment.

See the [event and consent contract](../../apps/docs/notes/analytics-funnel.md)
for supported events and verification requirements.

## Visual evidence

These images use synthetic local configuration and show public English/LTR
privacy controls at desktop and 390px mobile widths.

- [Desktop privacy](../../output/playwright/acquisition-measurement/desktop-privacy.png)
- [Mobile privacy](../../output/playwright/acquisition-measurement/mobile-privacy.png)
- [Mobile preferences](../../output/playwright/acquisition-measurement/mobile-preferences-open.png)
- [Earlier preferences recording](../../output/playwright/acquisition-measurement/preferences-withdrawal.webm)
  predates the removal of forced reload and is not proof of current withdrawal behavior.
