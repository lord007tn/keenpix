# Historical image analytics

Keenpix keeps customer image-delivery analytics separate from website analytics.
Google Analytics and Cloudflare Web Analytics RUM describe public-site journeys
and page performance. They are never used for customer usage, billing, or image
optimization totals.

## Authoritative origin history

Every request that reaches Keenpix is written to an organization- and
project-scoped request log and atomically accumulated into
`AnalyticsRollupHourly`. Raw logs follow the plan retention window, while the
hourly rollups are retained as the durable historical record. Deleting a project
deletes its rollups through the project relationship.

The Analytics page supports 24 hours, 7 days, 30 days, 90 days, 365 days, all
time, and an inclusive custom date window. Long windows are charted in bounded
weekly or coarse buckets, so the browser never receives every raw request.
The current filtered series can be exported as CSV.

Historical fields are exact when Keenpix recorded them. Records created before
the per-delivery savings field existed cannot reconstruct an original-image size
for old cache hits, because those deliveries did not fetch the origin. The UI
must not imply that unavailable value was measured later.

## Cloudflare edge history

Cloudflare can serve a cached image without contacting Keenpix. Those requests
are not customer origin events and are not billed by Keenpix. The authenticated
hourly usage job captures the available `/img/*` Cloudflare adaptive groups into
`EdgeRollupHourly`, starting immediately after application health succeeds and
then every hour. Dashboard reads remain a throttled best-effort refresh.

The stored edge data is zone/host-wide. In multi-tenant cloud it is visible only
to the platform operator and is never combined with a filtered customer or
project total. Coverage metadata prevents partial edge history from being
presented as a complete end-to-end total.

## Prospective project-attributed edge design

Exact project attribution at the edge requires a new collection boundary; it
cannot be recovered from existing aggregate rollups. The safe prospective design
is a narrowly scoped Cloudflare Worker on `keenpix.com/img/*` that:

1. Reads the existing public `project` query parameter but does not authorize
   with it; the Keenpix origin remains responsible for project lookup,
   entitlement, allowlist, and optional signature validation.
2. Proxies the request unchanged and writes only the opaque project id, hour,
   cache outcome, status class, and response-byte count to Workers Analytics
   Engine after the response.
3. Never stores the source URL, full query string, visitor IP, image content,
   signing value, API key, organization id, or account data.
4. Uses a dedicated dataset and least-privilege Worker binding. Keenpix pulls
   bounded hourly aggregates into an organization/project-scoped Postgres edge
   rollup after validating that the project belongs to that organization.
5. Runs first on a cloud-owned test route with parity, failure, sampling, and
   rollback evidence before any production `/img/*` route is attached.

This Worker is intentionally not attached during the v0.2.0 analytics rollout:
placing new code in the image-delivery request path requires a separate canary
and rollback window. Until that gate is approved, Keenpix reports exact
project-scoped origin history and separate operator-only aggregate edge history.

## Operational verification

- Confirm the `usage-cron` response contains `edgeHistory.configured: true`.
- Confirm its group count is non-zero when `/img/*` traffic exists.
- Confirm `EdgeRollupHourly` advances without opening the dashboard.
- Confirm a regular cloud tenant receives no zone-wide edge figures.
- Confirm 365-day, all-time, and custom windows never return another
  organization’s project or rollup rows.
- Confirm exported CSV totals match the visible filtered series.
