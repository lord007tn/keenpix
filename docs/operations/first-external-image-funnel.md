# First external image and the daily funnel

`origin_first_external_image_v1` (`definitionVersion` 1) is a prospective,
cookie-free server observation: the earliest qualifying origin observation per
project. It sits beside [`origin_first_image_v1`](first-image-activation.md).
The v1 eligibility definition, enrollment and existing rows are preserved, but
v1 capture now becomes best effort, with pending work and loss intervals exposed.
It answers a
different question: did an ordinary workspace serve an image from a source that
Keenpix does not host? It does not establish that a client received the response
or that a person viewed an image. Call it "first eligible external image", never
"activated customer".

## Definition

A **qualifying request** is a successful GET image response with bytes > 0,
observed by an instrumented origin (managed app path or standalone transform),
passing every `isActivationDelivery` exclusion: HEAD and non-GET, prewarm,
`__keenpix_preview`, `x-keenpix-request-purpose`, prefetch/prerender, app-host and
`www` referrers, and malformed referrers. Its source host must be external:
`isExternalImageSource` rejects `keenpix.com`, every subdomain of it, the
configured app host and its `www` form, case-insensitively, ignoring trailing
dots. A missing host does not qualify. The list is server-owned in
`packages/transform/src/activation.ts`.

An **eligible workspace** is not classified `internal` or `test`, has an ordinary
owner, and every member has platform role `user` (the v1 membership rule). Unlike
v1 no enrollment is needed, so unclassified workspaces count. Eligibility is
checked when an event is written and again when the funnel is read.

## Durability

`ProjectFirstExternalImage` stores only project/organization keys, observed time
and definition version. The primary key makes retries and replicas idempotent, a
composite foreign key binds the row to its tenant, and an earlier event moves the
stored time back. Deleting a project or organization cascades. `projectId` must
stay the table's only unique index: `ON CONFLICT` arbitrates that key alone, and a
second unique index turns simultaneous first deliveries into errors.

Both ledgers use the same idempotent statement; every existing v1 index remains.
Capture first filters observations already covered by each eligible ledger, then
acquires per-project transaction advisory locks in sorted lock-key order only for
remaining work, before either ledger writes. This prevents speculative inserts into v1's
primary and composite unique indexes from racing or deadlocking. Unrelated hash
collisions only serialize work. The isolated pool's lock and statement timeouts
still bound optional work. The specific v1 composite-index uniqueness fallback
retries a fresh standalone statement within a two-second retry budget. Transactional retries retain the
durable queue row and run in a fresh transaction on a later drain.

- **Standalone transform:** delivery and accounting never await capture. A
  process-local Map holds at most 256 distinct project/external keys, with two
  workers. Duplicate queued keys retain the earliest observation. A separate
  pool has at most two connections, a 500 ms connection/acquisition timeout,
  750 ms server statement timeout, 150 ms server lock timeout, and 1000 ms driver
  query and idle-transaction timeouts. Candidate timestamps are request-time
  observations, not background execution time. Errors use fixed messages only.
  Overload and capture errors lose observations. Graceful shutdown discards and
  records queued observations as interrupted, then waits for bounded active work.
- **Managed path:** accounting transfers aggregate candidates into
  `ImageMeasurementOutbox` under a savepoint. Optional handoff SQL uses bounded
  statement/lock timeouts. Handoff failure rolls back to the savepoint, allowing
  logs, rollups and accounting-outbox deletion to commit. After that commit,
  measurement uses its isolated pool after the accounting loop, detached from
  billing completion. Each pass claims up to 20 ready batches, stopping on no ready
  row or once 1.5 seconds have elapsed. The deadline is checked between operations;
  an operation already in progress remains bounded by its database timeouts. At most 1,000 batches are admitted; capacity overflow
  takes the interruption path. Failed attempts persist outside the capture
  transaction with a five-second lease, allowing other ready rows to progress.
  Five failed attempts or 24 hours retire the row together with a MIN/MAX
  observation-time interruption. Earlier failures retain original timestamps.
  Missing handoff tables can lose observations; unverified days remain Unknown.
  This queue contains keys, timestamps and the external boolean only.

## Coverage evidence and interruptions

A start timestamp alone does **not** establish coverage. Both external-image
columns require a closed `FirstExternalImageVerifiedInterval` covering the entire
UTC day, with no intersecting `FirstExternalImageInterruption` and no unresolved
measurement retry at or before that day. Even a one-millisecond interruption
makes the entire day Unknown. Covered-day totals derive from these nullable days.

Workers coalesce lost timestamps into persisted interruption intervals. When the
database itself is unavailable, persistence may also fail. A crash or rollback
cannot write a final record. These times remain Unknown because writers never
create verified intervals automatically. This deliberately sacrifices automatic
covered-day reporting rather than assert completeness from a heartbeat or from
absence of errors. Recorded milestones remain available as observed lower bounds.

Only attest a closed interval after independently establishing uninterrupted
capture across **every** writer, with all writers paused and queues drained.
Never attest an outage, an unobserved process exit, a rollback, or a period with
missing evidence. Keep intervals disjoint from such gaps. The operator command
also refuses pending candidates and known interruptions; it cannot supply the
independent runtime evidence itself:

```sh
pnpm --silent --filter @keenpix/app activation:readout --verify-external-coverage --apply --from <verified-start-UTC> --to <verified-end-UTC>
```

## Daily funnel

Totals are per half-open UTC day, for complete days only. **They are daily
milestone totals, not a cohort conversion rate:** a workspace reaching one
milestone today may have reached the previous one on any earlier day.

| Field | Meaning |
| --- | --- |
| `signups` | Users with platform role `user` created that day |
| `firstProjectWorkspaces` | Eligible workspaces whose earliest retained project was created that day |
| `firstExternalImageWorkspaces` | Eligible workspaces whose earliest observation across retained projects fell on that day; `null` is Unknown |
| `preexistingFirstExternalImageWorkspaces` | The subset whose first project predates coverage, so their real first image may be earlier; `null` is Unknown |
| `coverageStartedAt` | Recorded coverage start; `null` means coverage has not started |
| `pendingCandidateEvents` | Accounting and measurement candidates before `to`, including eventual exclusions |
| `observedWorkspaces` | Eligible workspaces with any recorded observation, for checking that capture is live |
| `definition`, `definitionVersion` | The definition these totals use |

`null` is never zero. A day reports first images only with whole-day verified
coverage at or after the coverage start. Partial start days remain Unknown. Eligibility
and retained rows are the current snapshot: rerunning a past window can change
after reclassification, deletion, or a late drain. Do not treat a day as settled
while `pendingCandidateEvents > 0`. Output contains counts only.

## Limits

- Edge-only cache hits bypass the origin, so an observation can be later than the
  first real delivery, and a project served only from the edge records nothing.
- Existing workspaces have no history. Their first observation after deployment
  is not a true first image, which is what the pre-existing subset separates out.
- A customer testing their own site looks like real traffic.
- The bot share is Unknown. A bot fetching an external image can qualify.
- Acquisition source is Unknown. This is cookie-free and has no consent-safe join
  to browser analytics.
- Background capture is best effort: overload, shutdown or failure may lose the
  real first observation. A later success cannot reconstruct that first time.
- Coverage certification is manual and requires independent evidence; without it,
  even a healthy day remains Unknown. A database failure never invents a zero.

## Release order

This additive migration preserves every existing table and index. Its composite
foreign key takes **SHARE ROW EXCLUSIVE on `Project`**, so use a quiet deployment
window and bounded lock/statement timeouts. Do not deploy services through plain
Compose: it starts transform first. The app entrypoint runs migrations on startup
unless explicitly disabled (`KEENPIX_RUN_MIGRATIONS=false`).

Keep `KEENPIX_RUN_MIGRATIONS=false` on app service starts until the migration-only
step is verified. Startup `migrate deploy` otherwise exits on failure under
`set -eu`, and Prisma P3009 can make every subsequent app start fail.

Check whether the endpoint is PgBouncer in transaction mode: the measurement
pool's PostgreSQL startup timeout parameters may be rejected there. Use an approved
direct/session endpoint for that pool and migration connection. Migration timeouts
are set transaction-locally by the migration SQL itself; they do not require URL
startup options. Do not silently remove timeout protection.

1. **Migration alone:** pin the new reviewed app image digest in the release
   configuration first, then run only its migration command with no dependencies.
   The migration begins an explicit transaction and calls
   `set_config('lock_timeout','5s',true)` and
   `set_config('statement_timeout','60s',true)` before its additive DDL. These local
   settings bound its lock/statement waits and revert at transaction end. For Compose:

   ```sh
   docker compose -f docker-compose.production.yml -f <digest-override> run --rm --no-deps --pull never app migrate
   ```

   The override must set `services.app.image` to the reviewed app digest.
   Production Compose otherwise has only `build:`, which may build on the host
   or select the wrong image. Verify the locally available digest before running.
   Verify the migration receipt and all new tables/indexes before proceeding.
   A lock timeout can leave a failed Prisma migration record (P3009). The migration
   runs in its own explicit transaction so its timeouts apply, which means Prisma
   reports only `current transaction is aborted` and `_prisma_migrations.logs` stays
   empty. After a wait of about 5 seconds, treat that message as a lock timeout. Inspect
   whether any additive objects remain and reconcile them with the reviewed SQL;
   marking a migration rolled back does not undo database changes. Before any
   retry, run the pinned app's Prisma command against the same migration database:

   ```sh
   docker compose -f docker-compose.production.yml -f <digest-override> run --rm --no-deps --pull never app \
     pnpm --filter @keenpix/database run migrate:resolve --rolled-back 20261030000000_first_external_image_funnel
   ```

   Then retry the migration-only step and verify it. Keep app startup migrations
   disabled throughout this recovery.
2. **App:** leave the current pre-capture transform image running and deploy only
   the pinned app digest. Compose declares app's transform dependency as
   `service_healthy`; omitting `--no-deps` can replace transform before app is verified,
   even when both digests are pinned in the override. Run exactly:

   ```sh
   KEENPIX_RUN_MIGRATIONS=false docker compose -f docker-compose.production.yml -f <digest-override> up -d --no-deps --no-build --pull never app
   ```

   Verify accounting drains commit, retries retain failed measurement, and the
   bounded measurement passes reduce a pre-existing ready backlog. Confirm the
   pinned image is locally available. App startup migrations stay disabled.
3. **Transform:** upgrade directly from its current pre-capture image to this PR's
   reviewed transform digest after app verification. **Never deploy the v0.3.3
   transform as an intermediate image.** It awaits capture inside `finally`, fails
   closed before accounting and takes no capture advisory locks; it can race the
   new app's drain. The current older pre-capture transform is safe beside the new
   app. `KEENPIX_RUNTIME_IMAGE_TAG` also selects the transform image in the base
   Compose file; the digest override must pin `services.transform.image` explicitly.
   Run only the transform service:

   ```sh
   KEENPIX_RUN_MIGRATIONS=false docker compose -f docker-compose.production.yml -f <digest-override> up -d --no-deps --no-build --pull never transform
   ```

   Verify cached and uncached image status, latency and accounting during synthetic
   measurement failure; verify sanitized logging. Use isolated synthetic/test workspaces.
   Verify `KEENPIX_APP_URL` and edge exclusions on every writer
   ([edge release](delivery-edge-release.md)).
4. **Start coverage:** only after all serving writers are verified. The start uses
   database time and cannot be backdated. Daily counts remain Unknown until closed
   intervals are independently verified as described above.

No browser screenshots are meaningful for this backend failure-isolation change;
unit contracts and the PostgreSQL failure/lock tests provide verification evidence.

## Readout commands

Run these inside the production app container, which provides `DATABASE_URL`.
They do not need pnpm, and they print exactly one JSON object.

```sh
# Daily funnel: whole UTC days, complete days only, at most 366.
docker exec <app-container> sh -c 'cd /app/apps/app && node_modules/.bin/tsx scripts/activation-readout.ts --daily --from 2026-10-01T00:00:00Z --to 2026-11-01T00:00:00Z'

# Start coverage once, after verification.
docker exec <app-container> sh -c 'cd /app/apps/app && node_modules/.bin/tsx scripts/activation-readout.ts --start-external-coverage --apply'
```

From a reviewed checkout with restricted credentials, the same options work
through `pnpm --silent --filter @keenpix/app activation:readout`. Invalid windows
and database failures exit nonzero with a generic error, never invented zeros.
Keep readouts private; aggregate counts of small cohorts can still be sensitive.

## Rollback

Redeploy the previous app and transform images. Keep all measurement tables and every row:
old images ignore them, and this migration has no down step. Do not delete the
coverage row or restore a snapshot to improve the numbers. Drain pending outbox
accounting and measurement work with the upgraded binary first where possible.
Old images ignore queued v1 as well as external measurement candidates. Persist any known gap in `FirstExternalImageInterruption` and do not certify the
rollback interval. Unverified days remain Unknown after a new image returns.

Record a known rollback gap with the upgraded operator command (no customer IDs):

```sh
pnpm --silent --filter @keenpix/app activation:readout --record-measurement-interruption --apply --from <gap-start-UTC> --to <gap-end-UTC>
```

## Consent boundary

This is first-party operational accounting. It adds no cookies, trackers, browser
storage, Google events, or consent changes, and it does not touch billing, usage
metering, quotas, or plans.
