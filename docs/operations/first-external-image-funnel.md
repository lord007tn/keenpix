# First external image and the daily funnel

`origin_first_external_image_v1` (`definitionVersion` 1) is a prospective,
cookie-free server observation: the earliest qualifying origin observation per
project. It sits beside [`origin_first_image_v1`](first-image-activation.md) and
does not change that definition, its enrollment, or its rows. It answers a
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

Both ledgers are written by one statement, `recordProjectFirstImageSuccesses`.

- **Managed path:** the existing outbox candidate bit carries the request-time
  exclusions and the persisted `sourceHost` decides the external flag at drain
  time. There is no outbox schema change and still one bulk statement per batch.
  Observation time is the original event time.
- **Standalone transform:** the same awaited statement as v1, not a second round
  trip, with the same fail-closed rule: a ledger error returns a sanitized 500
  before accounting, trading availability for measurement durability. Every
  otherwise qualifying cloud GET therefore depends on the database. Repeat
  deliveries skip the external insert with a primary-key check, so they take no
  row lock. On loopback PostgreSQL over Docker Desktop, 400 interleaved repeat
  deliveries measured 1 to 2 ms more at p50 than the v1-only statement in typical
  runs, on a noisy baseline of 5 to 7 ms. These are synthetic timings, not a
  production guarantee.

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
| `pendingCandidateEvents` | Candidate outbox events before `to`, including ones that may later be excluded |
| `observedWorkspaces` | Eligible workspaces with any recorded observation, for checking that capture is live |
| `definition`, `definitionVersion` | The definition these totals use |

`null` is never zero. A day reports first images only if the whole UTC day falls
at or after the coverage start, so the day coverage starts is Unknown. Eligibility
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
- Coverage starts once and has no gaps recorded in the database. A rollback or
  outage leaves uncovered days reading as measured, so record them privately.

## Release order

The migration adds two tables and indexes. It has no drops or backfill, and it
does not touch v1 tables, so older app and transform images keep working: they
never read or write the new tables, and database cascades cover deletion.

The reverse is not safe. The new statement requires the new table, so a new
transform running before the migration fails closed on **every qualifying GET**.
Production Compose starts `transform` before `app` and only `app` migrates on
start, so a plain stack redeploy would do exactly that.

1. **Migration first, as its own step.** Run the new app revision's `migrate`
   command as a one-off, without starting `transform`, and confirm it succeeded
   before any service restarts. With the production Compose file, for example:

   ```sh
   docker compose -f docker-compose.production.yml run --rm --no-deps app migrate
   ```

2. **Deploy app and transform together.** This is the first transform revision
   with any first-image capture, so it also adds v1's awaited statement. Confirm
   `KEENPIX_APP_URL` on both, and that the deployed delivery edge forwards the
   exclusion bit with the correct `APP_ORIGIN`
   ([edge release](delivery-edge-release.md)). Watch request latency, 5xx rate,
   database errors, and outbox backlog.
3. **Verify.** Run the daily readout below, and confirm the card on
   `/admin/analytics` shows Unknown. Using a workspace classified `test`, confirm
   that GET, HEAD, and preview requests write no ledger row and that request
   accounting is unchanged. Do not send synthetic traffic through customer
   workspaces.
4. **Start coverage** once every serving runtime is verified. This is database
   time, is never backdated, and repeating it keeps the original start. Until then
   every first-image count stays Unknown. Capture already runs, so nothing is lost.

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

Redeploy the previous app and transform images. Keep both tables and every row:
old images ignore them, and this migration has no down step. Do not delete the
coverage row or restore a snapshot to improve the numbers. Drain pending outbox
work with the upgraded binary first where possible, because old drainers do not
write this ledger. Record the private start and end of the gap, since days inside
it read as measured totals once a new image returns.

## Consent boundary

This is first-party operational accounting. It adds no cookies, trackers, browser
storage, Google events, or consent changes, and it does not touch billing, usage
metering, quotas, or plans.
