# Keenpix/JoodCMS production validation — August 2, 2026

Status: core delivery, analytics, cache, and backups verified; two missing
JoodCMS source hosts require an allowlist decision

This observation was performed against the Keenpix cloud resource
`uijso803l7sfoj5f076ka3f3`, running commit
`6ebe59787750ab8527222c09ae0a55e338e05fb2`.

## Service and delivery health

- `keenpix.com/api/health` and `keenpix.joodlab.com/api/health` returned `200`.
- PostgreSQL, ClickHouse, and object storage reported healthy. The transform
  queue was idle at observation time.
- The Joodlab organization (`cmrc25bc000000ot4edym1pmc`), Joodcms.com project
  (`cmpv3wabq000001pektm701au`), two members, and one relationally scoped API
  key were present.
- A production image variant returned `200 image/jpeg` with
  `Cache-Control: public, max-age=31536000, immutable` and `Vary: Accept`.
- A cache-busted outer URL returned Cloudflare `MISS` with Keenpix
  `x-keenpix-cache: HIT`; the immediate repeat returned Cloudflare `HIT`.
  The same sequence passed on both `keenpix.com` and
  `keenpix.joodlab.com`.

## Origin analytics reconciliation

The fixed half-open window was
`2026-08-01T19:00:00Z <= event < 2026-08-02T19:00:00Z`.

| Metric | PostgreSQL raw logs | PostgreSQL hourly rollups | ClickHouse |
| --- | ---: | ---: | ---: |
| Requests | 121,854 | 121,854 | 121,854 |
| Unique request ids | 121,854 | n/a | 121,854 |
| Status sum | 25,908,077 | 25,908,077 | 25,908,077 |
| Keenpix cache deliveries | 69,683 | 69,683 | 69,683 |
| Input bytes | 10,278,658,577 | 10,278,658,577 | 10,278,658,577 |
| Output bytes | 8,688,998,000 | 8,688,998,000 | 8,688,998,000 |
| Saved bytes | 7,710,813,002 | 7,710,813,002 | 7,710,813,002 |

ClickHouse contained no duplicate request ids. The live PostgreSQL and
ClickHouse heads continued advancing during the observation.

The rollup formulas also reconcile:

- 115,139 successful deliveries = 69,683 Keenpix cache deliveries + 45,456
  new optimizations.
- Origin cache hit rate is 60.52% of successful deliveries.
- Byte savings are 47.02% using `saved / (saved + delivered)`.

## Cloudflare edge analytics

For the settled 23-hour window ending at `2026-08-02T18:00:00Z`, a direct
Cloudflare GraphQL query returned 361,166 requests and 306,366 cache hits
(84.83%). Persisted `EdgeRollupHourly` data differed by one settling miss
(361,167 stored requests, a 0.000277% delta); cached counts and the other cache
statuses matched.

Using the dashboard's independent-source funnel calculation over that aligned
window, 373,773 of 417,853 captured successful deliveries were served from
Cloudflare or Keenpix cache (89.45%). Cloudflare adaptive observations are not
used as the authoritative origin/billing ledger.

The hourly usage job ran successfully throughout the observation and returned
`edgeHistory.configured: true` with non-zero groups. No usage, alert, retention,
or edge-capture failures were reported.

## Logs and errors

The latest 24-hour application log window contained 73,139 structured records.
There were no database, ClickHouse, analytics-buffer, cache-write, or edge
capture errors. Transform errors were attributable to upstream content:

| Error | Count |
| --- | ---: |
| Origin returned 404 | 1,004 |
| Origin was not a valid image | 139 |
| Origin timed out | 46 |
| Origin returned 502 | 1 |

The health counter recorded 194 queue rejections between
`2026-08-01T04:42:27Z` and `2026-08-01T08:55:09Z`, with none in the following
day. The SDK prewarm accepted up to 200 variants but previously submitted them
all to a queue capped at 100. The accompanying code change feeds prewarm jobs
through four bounded workers so it cannot overflow its own queue.

## Backup restore comparison

- The daily job wrote `keenpix-20260802-024616.dump` at 02:46 UTC.
- `pg_restore --list` parsed the PostgreSQL 18 custom archive successfully.
- The dump was restored into a temporary, isolated PostgreSQL 18 container.
- At the last complete hour before the snapshot, the restored backup and live
  production both contained exactly 4,037,783 unique JoodCMS request logs with
  identical status sum, cache count, input bytes, output bytes, and saved bytes.
- The restored hourly rollups matched the restored raw logs across the same
  metrics.
- The temporary restore container and volume were removed after verification.
- The retained management-host and off-host cutover manifests both passed all
  four database-dump SHA-256 checks.

## Configuration gap

The JoodCMS project is requesting two reachable source hosts that are not on
its allowlist:

| Source host | 403 responses in the fixed 24-hour window | Source sample |
| --- | ---: | --- |
| `static.joodlab.com` | 4,266 | returned `200 image/jpeg` |
| `res.cloudinary.com` | 633 | returned `200 image/jpeg` |

The 403s are the intended fail-closed behavior, not an analytics error. Add a
host only after the JoodCMS owner confirms it is an approved source; do not
broaden the allowlist for unrelated sample hosts. The separate
`us.dotwconnect.com` failures were confirmed upstream 404s and should be fixed
in source content rather than in Keenpix.
