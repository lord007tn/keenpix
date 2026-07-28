# Keenpix final production cutover

Status: completed on July 28, 2026; legacy application stopped and retained for
rollback

This record covers the final migration of the JoodCMS tenant from the legacy
self-hosted Keenpix service to the current Keenpix cloud deployment.

## Production state

- Cloud application: Coolify resource `uijso803l7sfoj5f076ka3f3`
  (`keenpix-branch-cloud`), running commit
  `79bc56487a9565034764a223c8f58fd664cf11ed`.
- Legacy application: Coolify service `gmy22ln5wjpzufn7i14p6nmb`, immutable
  revision `e8879d1e2e4839e86d6369b8266b6a60b591001f` (`v0.1.11`), stopped at
  `2026-07-28T19:13:17Z`.
- The legacy PostgreSQL container remains healthy and read-only from the
  migration operator's perspective. The legacy app remains stopped.
- `keenpix.com`, `www.keenpix.com`, and `keenpix.joodlab.com` route directly to
  the cloud app over HTTPS. The routing configuration deployment
  `l9j15rroel2cxtrnjeeb4sio` completed successfully at
  `2026-07-28T19:36:13Z`.
- The final code deployment `yvdq4flbysc21y8mkowii2q6` completed successfully
  at `2026-07-28T19:54:31Z`.

## Identity and access

- `fariq@joodlab.com` is the verified cloud credential account and `owner` of
  the `joodlab` organization (`cmrc25bc000000ot4edym1pmc`).
- The account is not banned and has an active credential provider. Password
  material and sessions were not copied.
- The organization has an active complimentary Business entitlement. It is not
  linked to a Polar customer and therefore is correctly excluded from provider
  usage ingestion while retaining Business serving and access limits.
- `admin@example.com` was explicitly excluded as the legacy bootstrap
  placeholder, not a production identity.
- Project `cmpv3wabq000001pektm701au` (`Joodcms.com`) belongs to the target
  organization.
- API key `Tn7Dl4EXY9YbGDpOEOEXSXfE6LcrdjSm` is enabled, uses the `internal`
  configuration, retains read/write project permissions, and has an exact
  relational scope to the target organization and project.
- Better Auth stores a verifier rather than recoverable plaintext. The
  migration preserved the existing key record and mutable state; it did not
  rotate or disclose the customer credential.

## Migration execution

The final run used:

```text
MIGRATION_RUN_ID=keenpix-joodlab-20260728t2000z-final
MIGRATION_MODE=execute
MIGRATION_SINCE_AT=2026-07-17T10:00:00.000Z
MIGRATION_CUTOVER_AT=2026-07-28T20:00:00.000Z
```

All copy and reconciliation queries used the half-open interval
`MIGRATION_SINCE_AT <= row < MIGRATION_CUTOVER_AT`.

Final bounded results:

| Dataset | Source rows | Missing | Extra | Mismatched |
| --- | ---: | ---: | ---: | ---: |
| RequestLog | 841,326 | 0 | 0 | 0 |
| AnalyticsRollupHourly | 677,552 | 0 | 0 | 0 |
| ApiKeyActivity | 1,408 | 0 | 0 | 0 |

One cloud-native request log and one overlapping-window cloud-native rollup
were identified and preserved. The frozen legacy source contained 3,617,788
request logs. The reconciled target contained those rows plus four historical
cloud-native rows. Migration checkpoints were removed after verification.

ClickHouse was rebuilt once from PostgreSQL while the cloud writer was stopped:

```text
PostgreSQL rows:       3,617,792
Rows replayed:         3,617,792
ClickHouse rows:       3,617,792
ClickHouse unique IDs: 3,617,792
```

Independent per-organization/project aggregates matched for request count,
status sum, cache count, bytes in, bytes out, and bytes saved. Live ingestion
resumed after the rebuild.

## Validation

- All three production health endpoints returned `200` with PostgreSQL,
  ClickHouse, and object storage healthy.
- A real migrated JoodCMS transform through `keenpix.joodlab.com` returned
  `200 image/avif` with a 103,837-byte response.
- The SDK endpoint is present on the routed hostname and rejects missing
  credentials with `401`.
- Post-cutover database joins confirmed the owner, organization, project,
  enabled API key, and exact key scope in one access graph.
- All cloud compose services were running after deployment; the app,
  PostgreSQL, ClickHouse, Maxio, and Mailpit health checks were green.
- The scheduled usage job resumed after the deployment startup interval.
- The final live observation snapshot matched at 3,619,504 unique request IDs
  in both PostgreSQL and ClickHouse, with the same maximum event timestamp.
- The final application log window contained no severity-50 errors.
- Recent transform errors were upstream `404` or invalid-image responses, not
  migration or database failures.
- A Cloudflare analytics window error exposed during observation was fixed by
  deriving both query bounds from one timestamp and keeping the interval below
  the provider's strict one-day cap. A regression test covers the boundary.

## Backups

Primary cutover artifacts are retained on the management host at:

```text
/data/coolify/backups/keenpix-cutover-20260728
```

An off-host copy is retained on the separate data server at:

```text
/srv/backups/keenpix-cutover-20260728
```

Both locations contain the pre-cutover cloud dump, live legacy dump, frozen
legacy dump, post-cutover cloud dump `cloud-final-20260728T1957Z.dump`, and a
checksum manifest. All checksums passed at both locations. Temporary keys used
for the direct server-to-server transfers were removed.

The cloud PostgreSQL backup job remains scheduled daily with 14-day local
retention. Off-host cutover artifacts are intentionally retained through the
rollback window.

## Rollback

Do not run both application writers against the same hostname.

1. Remove `keenpix.joodlab.com:3000` from the cloud app domains and apply the
   Coolify configuration.
2. Restore `https://keenpix.joodlab.com:3000` to the legacy app domains.
3. Start the frozen legacy application and verify its health before applying
   the legacy proxy configuration.
4. Treat cloud writes accepted after `2026-07-28T19:13:17Z` as a new delta to
   reconcile before any second cutover.
5. If storage recovery is required, restore only from a checksum-verified dump
   into a new database first; never overwrite either retained database during
   diagnosis.

## Follow-up operations

- Keep the legacy application and its database recoverable through the agreed
  observation window. Retirement is a separate, explicit operation.
- Monitor cloud error rate, transform latency, PostgreSQL/ClickHouse count
  drift, backup completion, billing usage reporting, and Cloudflare edge
  history.
- Resource caps remain unset. The stopped legacy app released approximately
  1.4 GiB and one CPU core of active pressure, leaving about 4.1 GiB available
  after cutover. Set caps only after collecting production peaks; an arbitrary
  post-cutover cap could introduce an OOM or throttling regression.
