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

The Analytics and Live logs pages share the same Google-Analytics-style range
picker. The compact strip exposes 24 hours, 7 days, 30 days, and Custom. Opening
Custom shows shortcuts for today, yesterday, week/month/year windows, 90 and
365 days, and all available retained history beside the inclusive calendar.
Pro and Business can query up to 365 days; Basic can query up to 90 days. Both
the browser and authenticated server functions clamp custom dates to the plan
boundary. Long analytics windows are charted in bounded weekly or coarse
buckets, so the browser never receives every raw request. The current filtered
analytics series can be exported as CSV, and visible log rows can be exported
as NDJSON.

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
project total. Historical zone/host sources remain queryable after a hostname
or zone migration. Coverage is calculated across the union of source capture
intervals; partial history is displayed with that qualification, and uncovered
intervals are never estimated or presented as a complete end-to-end total.

Operator CSV exports use the same time buckets as the selected chart and carry
separate columns for requests observed at Cloudflare, responses served by the
Cloudflare cache, requests forwarded by Cloudflare, requests reaching Keenpix,
Keenpix cache deliveries, and newly optimized deliveries.

## Project-attributed edge delivery

The canonical cloud URL is
`https://cdn.keenpix.com/p/<project-id>/img/<encoded-source>`. The public Worker
extracts the project id from that path, forwards the transform to Keenpix's
existing `/img/*` origin route, and adds a secret-authenticated project header.
The origin still owns project lookup, entitlement, allowlist, and optional URL
signature validation. In v0.3, public managed delivery is accepted only on the
canonical project path at the edge hostname. Customer custom domains continue
to use `/img/*` and resolve the project from their verified hostname without a
public project parameter.

The Worker:

1. Accepts the project path only on the configured first-party delivery host.
2. Writes only the opaque project id, hour, cache outcome, status class, and
   response-byte count to Workers Analytics Engine after the response.
3. Never stores the source URL, full query string, visitor IP, image content,
   signing value, API key, organization id, or account data.
4. Uses a dedicated dataset and least-privilege Worker binding. Keenpix pulls
   bounded hourly aggregates into an organization/project-scoped Postgres edge
   rollup after validating that the project belongs to that organization.
5. Classifies every response into one mutually exclusive delivery stage:
   `edge`, `cache`, `optimized`, or `failed`.

Cloud SDKs, framework packages, onboarding examples, and documentation emit the
canonical project path so edge requests remain attributable even when Cloudflare
serves them without reaching Keenpix.

Zone-wide history created before the project path cannot normally be assigned
to a tenant. If an operator can prove that a bounded legacy zone/host interval
belonged exclusively to one project, `pnpm db:backfill-project-edge` provides a
dry-run-first, cutoff-based promotion. It copies only Cloudflare-offloaded
statuses that are absent from origin analytics, uses stable IDs, refuses a
cutoff that overlaps trusted project history, and reconciles rows, requests,
and bytes after execution.

## Operational verification

- Confirm the `usage-cron` response contains `edgeHistory.configured: true`.
- Confirm its group count is non-zero when `/img/*` traffic exists.
- Confirm `EdgeRollupHourly` advances without opening the dashboard.
- Confirm a regular cloud tenant receives no zone-wide edge figures.
- Confirm 365-day, all-available, and custom windows never return another
  organization’s project or rollup rows.
- Confirm Basic cannot query before its rolling 90-day boundary and Pro or
  Business cannot query before their rolling 365-day boundary.
- Confirm exported CSV totals match the visible filtered series.
- Confirm a migrated historical edge source remains visible without widening
  Cloudflare access or replacing the currently configured capture source.
