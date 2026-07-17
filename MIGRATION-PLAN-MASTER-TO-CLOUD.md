# Keenpix production migration plan

Prepared: 2026-07-11  
Scope: legacy Keenpix production on Coolify to the current cloud architecture on `coolify.joodlab.com`  
Backup scope: PostgreSQL backup implementation is intentionally excluded; Coolify remains responsible as requested.

## Executive decision

Do not perform the production cutover yet. The cloud application is healthy and structurally ready for a rehearsal, but its copied PostgreSQL data is behind the still-live legacy source, the migrated API key lacks required cloud ownership metadata, and the exact legacy release has not been pinned to an immutable image digest or verified commit.

The safe path is:

1. identify and freeze the exact source release;
2. repair and harden the migration utility;
3. complete a live-source rehearsal and reconciliation;
4. schedule a short write freeze;
5. copy the final bounded delta;
6. rebuild ClickHouse from the reconciled PostgreSQL target;
7. attach the legacy API hostname to the cloud app;
8. validate the existing API key and production flows;
9. keep the legacy service intact for rollback until the observation window closes.

## Discovery snapshot (2026-07-11; not the current release state)

The source observations and branch counts below were captured during the
original discovery pass and were not refreshed, because v0.2.0 explicitly
forbids any new legacy access. The current cloud release baseline is commit
`2779d60` in Coolify deployment `k960s5uqueopks3bftqzt023`; source identity and
data freshness still require a later, explicitly authorized preflight.

### Source production

- Coolify resource: service `keenpix`, UUID `gmy22ln5wjpzufn7i14p6nmb`.
- Image: `ghcr.io/lord007tn/keenpix:v0.1`.
- API hostname: `https://keenpix.joodlab.com:3000`.
- PostgreSQL is healthy.
- The image tag is mutable and does not prove which Git commit is running.
- Coolify reports unapplied configuration; avoid redeploying the legacy service until its exact running image digest and configuration are captured.

### Cloud target

- Coolify application: `keenpix-branch-cloud`, UUID `uijso803l7sfoj5f076ka3f3`.
- Git branch: `cloud`.
- Public domain: `https://keenpix.com`.
- PostgreSQL and ClickHouse are available.
- At discovery, `origin/master` was `e8879d1e2e4839e86d6369b8266b6a60b591001f` and `origin/cloud` was `c60e02aa099928e2b5b5aa7f42a7db11bc948099`.
- At discovery, `cloud` contained `master` and was 45 commits ahead; the diff spanned 333 files.

### Data freshness observed during discovery

| Dataset | Legacy source | Cloud target | Cutover implication |
|---|---:|---:|---|
| Users | 2 | 3 | Decide disposition of the second legacy user. |
| Projects | 1 | 1 | Reconcile mutable fields, not only row existence. |
| API keys | 1 | 1 | Target key is missing `metadata.orgId` and is not cloud-ready. |
| API key activity | 1,653 | 1,581 | Final delta required. |
| Hourly rollups | 1,723,356 | 1,591,489 | Final delta and exact reconciliation required. |
| Request logs | 2,266,462 | 2,101,601 | Final delta required; source was still receiving writes. |
| ClickHouse events | n/a | 3 | Rebuild after final PostgreSQL reconciliation. |

Observed maximum request timestamps were approximately 2026-07-10 23:54 UTC on the source and 20:59 UTC on the target. These are discovery values, not cutover watermarks.

## Blocking gaps

### P0 — source identity

Capture the running container's immutable OCI digest, image creation metadata, application version endpoint if available, and effective environment/configuration. Match that release to a Git commit or produce a documented compatibility assessment against the cloud schema. The migration must not assume that `v0.1` equals current `master`.

### P0 — API-key ownership

The cloud SDK authorization path requires `apikey.metadata.orgId`, and internal UI queries also scope keys through that field. The migrated key currently lacks it. A cutover in this state risks returning 403 to existing clients even though the raw key row exists.

### P0 — unsafe resume semantics

The current migration utility resumes large tables from the target's global maximum timestamp/order. That can skip holes after an interrupted run or when unrelated/newer target data exists. `ApiKeyActivity` also lacks an organization/key-scoped checkpoint.

### P0 — source still changing

The source remained live during discovery. Counts cannot reconcile until writes are quiesced and a final inclusive cutover watermark is recorded.

### P1 — incomplete identity decision

The source has two users, while the existing workflow explicitly moves one configured owner and credential. Decide whether the second user is an active account to migrate, an obsolete account to retain only in the legacy source, or an identity to merge. Sessions should not be migrated.

### P1 — ClickHouse duplication risk

The backfill targets a plain `MergeTree`; it is not inherently idempotent. Running it while the cloud application is also teeing live events can duplicate rows. Stop cloud writes to ClickHouse, truncate/recreate the intended event set, backfill once from reconciled PostgreSQL, then resume ingestion.

## Migration utility changes required before rehearsal

1. Add an explicit migration-run identifier and immutable source/target fingerprints.
2. Accept bounded `--since` and `--until` watermarks, or persist per-table source checkpoints. Every copied row must be inside a declared source window.
3. Replace target-global-max resume logic with idempotent keys or source-scoped checkpoints. Record row counts and last processed primary keys per table.
4. Scope API activity checkpoints to the migrated key or organization.
5. Upsert the project fields that can change on the source. Preserve cloud-only signed-URL/configuration fields unless the migration contract explicitly replaces them.
6. Upsert the API key's counters, last-request state, project relationship, and metadata. Stamp the target organization's ID while preserving any compatible legacy metadata.
7. Make the owner and second-user policy explicit through required arguments or a reviewed manifest.
8. Add preflight schema/version checks and fail closed on an unknown source release.
9. Add post-run reconciliation output: source-window count, target-window count, min/max timestamp, distinct key/project counts, and deterministic checksums for critical fields.
10. Keep dry-run read-only and make every write phase independently repeatable.

## Rehearsal plan

1. Freeze an immutable record of source image digest, effective environment names, database schema version, and cloud target commit.
2. Review a migration manifest containing:
   - source service UUID and digest;
   - target app UUID and commit;
   - source owner and target organization;
   - second-user disposition;
   - project ID and API key ID;
   - tables included/excluded;
   - proposed rehearsal watermark.
3. Run schema preflight and a dry run.
4. Run an initial bulk copy while the source is live, bounded by a recorded `T_rehearsal`.
5. Reconcile every migrated table inside that window. Zero unexplained differences are allowed for identity, project, API key, activity, rollup, and request-log data.
6. Validate in an isolated target session:
   - owner can sign in;
   - organization and membership resolve;
   - internal Business grant is active;
   - project settings are correct;
   - the existing API key is visible and accepted;
   - SDK and transform calls behave as expected;
   - analytics pages read PostgreSQL correctly.
7. Rehearse ClickHouse truncate/backfill with cloud event ingestion stopped, then compare ClickHouse aggregates to PostgreSQL.
8. Record duration and throughput for each stage to size the maintenance window.

## Production cutover runbook

### T-24 hours

- Announce a short write-maintenance window and name the operator, verifier, and rollback decision-maker.
- Confirm Coolify-managed database backup status without adding repository-managed backup jobs.
- Confirm DNS/proxy access for both `keenpix.com` and `keenpix.joodlab.com`.
- Confirm Postmark domain/token, Polar production organization/token, webhook destinations, application secrets, cron/worker behavior, and health checks in the target.
- Re-run dry-run and preflight against the immutable source digest and target commit.
- Set explicit go/no-go thresholds and a maximum cutover duration.

### Start maintenance

1. Put the legacy API into maintenance/read-only mode or stop the legacy application while leaving its database running.
2. Verify request-log and activity maximums stop advancing for a defined quiet period.
3. Record `T_cut`, per-table source counts, min/max timestamps, and final checkpoints.
4. Run the final bounded delta through `T_cut`.
5. Apply/verify organization metadata on the migrated API key and reconcile mutable project/key state.
6. Run all reconciliation queries. Any unexplained row/count/checksum difference is a no-go.
7. Stop cloud event ingestion, clear the target ClickHouse event table, backfill once from the fully reconciled PostgreSQL target, and reconcile aggregates.
8. Start/restart the cloud application and workers.

### Route traffic

- Attach `keenpix.joodlab.com` directly to the cloud application/proxy so existing SDK clients keep the same API origin. Prefer an origin-preserving proxy route over an HTTP redirect for API traffic.
- Keep `keenpix.com` as the canonical product/marketing host.
- Configure `www.keenpix.com` to permanently redirect to the apex with 308.
- Prefer 308 for HTTP-to-HTTPS canonical redirects after validating proxy behavior.

### Production smoke tests

- Existing production API key succeeds against the legacy hostname now routed to cloud.
- `/api/sdk` authorization, transform behavior, project allowlists/origins, caching, and error contracts match expectations.
- Owner sign-in, organization membership, dashboard, project, API-key visibility, and activity views work.
- New request events appear once in PostgreSQL/ClickHouse as designed.
- Postmark sends a real low-risk transactional message and records delivery.
- Polar webhook authenticity and target endpoint are verified; subscription-independent access remains granted through the internal Business plan.
- Health checks, background jobs, scheduled cleanup, and watermark/configuration paths are healthy.
- Public SEO endpoints return 200: `/`, `/robots.txt`, `/sitemap.xml`, canonical URLs, and representative docs/blog pages.

## Go/no-go gates

Proceed only when all are true:

- immutable source release captured and compatibility approved;
- source writes are quiescent;
- final bounded migration completes without error;
- critical-table reconciliation has zero unexplained differences;
- target API key contains the correct organization metadata and passes a real request;
- ClickHouse is rebuilt without concurrent ingestion and matches expected aggregates;
- both public hostname and legacy API hostname have valid TLS and correct routing;
- Postmark, Polar, auth, jobs, and representative product flows pass;
- rollback route and legacy service start procedure have been tested or verified.

Abort or roll back on authorization failures, data divergence, duplicate analytics events, sustained elevated 5xx responses, contract-breaking API responses, or failure to complete within the approved window.

## Rollback

1. Route `keenpix.joodlab.com` back to the legacy service.
2. Restart/remove maintenance from the legacy application.
3. Verify the original API key and request path.
4. Preserve target imports and logs for diagnosis; do not attempt destructive reverse synchronization during the incident.
5. Determine whether any cloud-only writes occurred. If so, document them and plan a separate, reviewed reconciliation before the next attempt.

The legacy service and database remain intact until the observation window is complete. Rollback does not depend on a new manual PostgreSQL dump.

## Observation and retirement

- Monitor error rate, latency, authorization failures, transform success, request/event count parity, queue/jobs, email delivery, and Polar webhooks intensely for the first 2 hours.
- Maintain heightened review for 24–48 hours.
- Keep the legacy service stopped but recoverable after confidence is established.
- Retire legacy routing and resources only after explicit owner approval and a final reconciliation snapshot.
- Preserve the immutable source digest, migration manifest, reconciliation output, and cutover log as the migration record.

## Ownership checklist

| Role | Responsibility |
|---|---|
| Migration operator | Runs preflight, bounded copy, reconciliation, and ClickHouse rebuild. |
| Coolify operator | Freezes services, verifies backup state, routes domains, and controls rollback. |
| Product verifier | Tests auth, SDK, transforms, dashboard, Postmark, Polar, and jobs. |
| Decision-maker | Owns go/no-go and rollback thresholds. |
| Observer | Watches logs/metrics and records timestamps during the cutover. |

## Immediate next actions

1. Capture the legacy running image digest and map it to a commit/release.
2. Decide the second legacy user's disposition and confirm the target owner/organization.
3. Patch and review the migration utility around API-key metadata, bounded checkpoints, upserts, and reconciliation.
4. Run a full rehearsal with a recorded watermark.
5. Schedule the production maintenance window only after the rehearsal passes.
