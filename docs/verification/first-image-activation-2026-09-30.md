# First-image activation source verification — 2026-09-30

Scope: `origin_first_image_v1` source, additive migration, restricted aggregate
command, and CI. This record contains synthetic local evidence only. No production
deployment, customer classification, provider change, or production activation
count was performed for this change.

## Verified

- Frozen pnpm install and Prisma client generation passed.
- All repository migrations, including the activation migration, applied to a
  disposable loopback PostgreSQL 18 database named `keenpix_activation_test`.
- Ten real PostgreSQL integration tests passed. They cover unknown/internal/test
  exclusions, ordinary ownership, platform operators including a staff member
  alongside an ordinary owner, tenant lookup and composite foreign key, deletion,
  and current-snapshot aggregate/window semantics.
- Twenty-four concurrent attempts plus retry produced one ledger row. Earlier
  out-of-order observations converge on the earliest qualifying event time.
- An intentionally rolled-back outbox drain left the candidate intact and wrote
  neither ledger nor request log. Retry committed the ledger, one request, and
  the original byte rollup atomically. A second drain added nothing.
- Old outbox rows and pre-enrollment events did not reconstruct activation. A
  mixed batch spanning enrollment retained the earliest eligible event, even
  when it arrived after a later candidate.
- Focused HTTP/action tests cover GET success, HEAD with an empty response body,
  failed/empty transforms, trusted/prewarm/self-hosted exclusions, purpose and
  preview signals, durable-write failure, and resolved project ownership.
  Edge tests verify the exclusion bit without forwarding cookies or referrer URLs.
- Denied/granted/withdrawn cookie states do not change the operational request
  predicate. No Google emitter, attribution join, or browser-storage measurement
  was added. Existing consent regression tests passed within repository health.
- `pnpm health` passed lint, typecheck, tests, Knip, React Doctor, and all builds.
  The app suite passed 583 tests in 120 files. The docs test process emitted its
  Vite shutdown warning while exiting successfully; no failing check was hidden.
- The operator readout ran successfully against the empty disposable database
  after fixture cleanup. Its zero counts are synthetic and say nothing about
  production. The output contains aggregate counts and coverage labels only.
- Schema comparison found no activation-model drift. Its only differences were
  the two existing RequestLog GIN trigram indexes created by the July search
  migration and not represented in Prisma's schema. They were left intact.
- `git diff --check` passed. CI adds a PostgreSQL service and migration/contract
  test; it does not build Docker images. Image builds remain explicitly manual.

The integration command refuses to run unless the database name and explicit
test marker match and the database host is loopback. Its fixtures use only
synthetic `example.test` identities, and cleanup is scoped to created fixtures.

## Reproduction

With the dedicated disposable PostgreSQL database and its local `DATABASE_URL`:

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @keenpix/database run deploy
# Set KEENPIX_ACTIVATION_TEST_DATABASE=keenpix_activation_test in the environment.
pnpm --filter @keenpix/database test:activation
pnpm health
```

Screenshots and recordings are not meaningful for this backend/operator-command
change. Equivalent evidence is the real database concurrency/rollback suite,
HTTP response assertions, aggregate-contract assertions, and automated CI. No
dashboard or other visual interface was introduced.

## Release evidence still required

Follow the [operator contract and rollout procedure](../operations/first-image-activation.md).
Verify deployed revision/migration, all serving runtimes and edge configuration,
queue drain, latency, and private workspace classifications before enrollment.
Production billing, customer outcomes, and provider attribution remain unverified.
Legacy first-use history and edge-only cache deliveries remain unknown even after
deployment. This origin observation must not be relabeled as proof of receipt,
human viewing, or a consented Google conversion.
