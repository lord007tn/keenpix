# First-image origin observation

`origin_first_image_v1` is a prospective operational measurement. It records the
earliest qualifying successful, nonempty GET observed by an instrumented Keenpix
origin for an explicitly classified customer project. It does not establish that
the client received the response, a person viewed an image, or a Google conversion
occurred. Do not label request totals or browser milestone keys as this metric.

## Eligibility and durability

An operator must classify the organization as `customer`. The organization must
have an ordinary platform user (`User.role = user`) with organization role `owner`,
and every member must have platform role `user`. Any platform operator/unknown
role excludes the organization. Organization role `admin` alone is not a platform
operator role. No policy, or `unclassified`, means unknown and is excluded from
the customer cohort. Explicit `test` and `internal` classifications exclude
documented QA and operator workspaces. Keep the identity mapping in private
operations records; do not commit identities or production readouts here.

Enrollment uses database time. Repeating `customer` preserves its start time;
changing to another classification ends coverage. Re-enrolling starts a new
coverage interval and never backdates it. Existing observations are retained and
are not relabeled as new activation after re-enrollment. An earlier observation
outside the current interval remains outside the current readout.

The public HTTP boundary excludes HEAD/non-GET, authenticated trusted operations,
prewarm (`recordLog: false`), failed/empty responses, self-hosted mode, requests
with `__keenpix_preview`, any `x-keenpix-request-purpose` header, prefetch/prerender
purpose headers, and referrers on the configured app hostname (including `www`).
Malformed referrers are excluded. Normal origin, signature, tenant, and billing
checks still run. Use a purpose header for operator/API smoke tests and classify
test workspaces before testing. Anonymous, unmarked operator/QA GETs cannot be
distinguished from ordinary traffic; this metric does not solve that ambiguity.

The delivery edge forwards only an exclusion bit, not account cookies or the
referrer URL. Its cache hits can bypass the origin entirely. This definition has
**origin-only coverage**: it cannot establish the exact first edge delivery or
reconstruct historical cache hits. App previews may also warm a cache before
ordinary traffic, delaying its first recorded origin observation.

The ledger stores only project/organization keys, observed time, and definition
version. A unique project key makes retries and concurrent replicas idempotent;
a composite foreign key enforces tenant binding. Qualifying out-of-order events
can move the stored time earlier, without creating another record. Project or
organization deletion cascades to the ledger; this is a retained-project metric,
not a permanent historical customer ledger.

The managed app persists the candidate bit in the existing durable analytics
outbox before returning success. Draining commits the ledger, request log,
billing rollup, and outbox deletion in one transaction. Its observation time is
the original event time, not drain time. Old outbox rows default to non-candidates.
Events before enrollment cannot be backfilled into activation. Each managed
batch adds at most one bulk activation SQL statement. Tenant/enrollment/membership
filters run before selecting each project's minimum event time, so a rejected
earlier event cannot hide a later eligible event. Repeated observations preserve
the existing earlier time and do not insert another row.

The standalone transform adds one awaited SQL statement for **every otherwise
qualifying cloud GET**, including unclassified/excluded workspaces and projects
already observed. Eligibility is determined inside that statement; no cached
classification can silently extend customer coverage after an exclusion. This
cost and database availability dependency apply even when no row is written.
HEAD, marked preview, prewarm, and self-hosted requests skip it.

The standalone runtime checks durability before buffering successful accounting
and returning an image. A ledger-query error therefore returns a sanitized 500,
without enqueueing a successful request. This deliberate fail-closed policy
prevents acknowledging an origin success while its first observation is silently
lost; it trades availability for measurement durability. On retry, a successful
ledger query allows exactly one success enqueue for that attempt. If the database
committed but its acknowledgment was lost, the earlier ledger row may survive
the failed HTTP attempt; the retry converges on that same row. This is another
reason the ledger does not prove receipt. The standalone analytics buffer itself
remains non-durable and is not an exactly-once billing guarantee. Monitor request
latency, database failures, and managed backlog before customer enrollment.

## Restricted operator commands

Use the reviewed checkout with dependencies installed, Prisma generated, and a
restricted operator `DATABASE_URL` supplied through the approved secret mechanism.
The command is not an app route or tenant API. Classification is a privileged
write; the aggregate query requires read access to projects, membership, policy,
ledger, and outbox. Do not expose these cross-tenant credentials to clients.

After every serving runtime is verified, classify known workspaces individually:

```sh
pnpm --filter @keenpix/app activation:readout --org <organization-id> --classification test --apply
pnpm --filter @keenpix/app activation:readout --org <organization-id> --classification internal --apply
pnpm --filter @keenpix/app activation:readout --org <organization-id> --classification customer --apply
```

Classify customer workspaces only from verified private operational evidence.
New/unreviewed organizations remain unknown. Do not bulk assume every ordinary
account is a customer. The command returns classification and changed-row count,
without identifiers. Missing organizations and invalid arguments fail nonzero.

Repeat the same explicit half-open UTC window to generate an aggregate:

```sh
pnpm --filter @keenpix/app activation:readout --from 2026-10-01T00:00:00Z --to 2026-11-01T00:00:00Z
```

Use the JSON object emitted by the command (pnpm also prints its command banner).
It includes the definition, generation time, boundaries, and coverage labels.
It contains no identities, image URLs, visitor/source attribution, or per-customer
rows. Keep operational counts private; even aggregate small cohorts can be
sensitive. Failure produces a nonzero exit and generic error, never invented zeros.

| Field | Meaning |
| --- | --- |
| `retainedProjects` | Current retained projects created before `to` |
| `unclassifiedProjects` | No policy or explicitly unclassified |
| `excludedProjects` | Internal/test, or customer classification failing membership eligibility |
| `classifiedCustomerProjects` | Currently classified customer with eligible membership |
| `prospectiveProjects` | Eligible projects created on/after their current enrollment and before `to` |
| `prospectiveProjectsCreatedInWindow` | Those prospective projects created in `[from, to)` |
| `prospectiveFirstSuccessesInWindow` | Prospective projects whose first qualifying origin observation is in `[from, to)` |
| `legacyFirstObservationsInWindow` | Eligible projects predating enrollment with an in-window observation; lifetime-first history is unknown |
| `prospectiveProjectsWithoutObservation` | Prospective projects without a recorded observation before `to`; not proof of no delivery |
| `pendingCandidateEvents` | Candidate outbox events before `to` awaiting drain, including candidates that may later be excluded |

Do not treat an observation count as settled while `pendingCandidateEvents > 0`.
A zero backlog still cannot prove edge-only delivery, receipt, viewing, or complete
coverage across deployment gaps. The first-success numerator may contain projects
created before `from`; dividing it by projects created in the window is **not** a
cohort activation rate. Current classification/membership and retained projects
are evaluated in one database statement: rerunning a historical window can change
after classification corrections, membership changes, earlier events, or deletion.
Save the timestamped private readout with its exact revision and deployment coverage.

## Release and rollback

1. Run the migration before deploying writers. It adds two tables and an outbox
   boolean defaulting to false; it does not reconstruct historical activation.
   Older binaries tolerate the additive schema but cannot maintain new coverage.
2. Deploy the reviewed app, standalone transform, and delivery edge revisions.
   Configure transform `KEENPIX_APP_URL` and edge `APP_ORIGIN` to the real app
   origin (production defaults are `https://keenpix.com`). Verify all active
   replicas, routes, queue processing, and latency. Docker builds remain manual.
3. With only explicitly excluded test/internal organizations, verify GET success,
   HEAD/preview/prewarm exclusion, tenant binding, durable outbox drain, and
   unchanged billing. This source PR and CI are not production evidence.
4. Review the private exclusion inventory, drain pre-rollout work, then enroll
   verified customer organizations. Record enrollment/deployment boundaries
   privately. Existing projects are legacy; prior activation remains unknown.
5. Run the restricted aggregate and inspect backlog. Do not send synthetic traffic
   into customer workspaces to make counts nonzero.

For rollback, stop customer capture by changing enrolled policies to
`unclassified` using the restricted command. Preserve the private prior
classification inventory. Drain pending request accounting with the upgraded
binary before reverting it; old drainers do not write the new ledger. Retain the
additive schema and all ledger records. Do not drop tables or restore an old
snapshot to improve the metric. Document the coverage interruption; a later
re-enrollment starts fresh coverage and cannot recover missing observations.

## Consent and attribution boundary

This is first-party operational accounting without Google IDs, browser storage,
cookies, or visitor attribution. Denied, granted, and withdrawn analytics consent
do not alter this server contract. It emits no `first_image_served` Google event.
There is still no consent-safe project-to-Google join. Browser consent/source
behavior is unchanged, including the existing native-provider buffering limit
described in the [measurement notes](../../apps/docs/notes/analytics-funnel.md).

See the [source verification](../verification/first-image-activation-2026-09-30.md)
for local evidence and remaining release gates.
