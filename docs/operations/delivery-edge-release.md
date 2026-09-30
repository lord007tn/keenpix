# Delivery edge release

The package is `@keenpix/delivery-edge`; its serving Worker remains
`keenpix-custom-domain-edge`. Use the pinned `cf` CLI through package scripts.
The project builds with the Cloudflare Vite plugin and does not invoke Wrangler.
Node.js 22.18 or later is required. Keep the compatibility date unchanged unless
a separate runtime upgrade has been reviewed.

## Account and baseline

Use an existing authorized `cf` profile or deployment credential. No login or
new token is required when `cf auth whoami` confirms a valid existing identity.
Set `CLOUDFLARE_ACCOUNT_ID` locally to the account that owns the production zone;
never infer the owner from an email address or commit credentials/account IDs.
Verify the zone's returned account matches that setting before uploading.

```sh
pnpm --filter @keenpix/delivery-edge exec cf auth whoami
pnpm --filter @keenpix/delivery-edge exec cf zones list --name keenpix.com
pnpm --filter @keenpix/delivery-edge exec cf workers deployments list --worker keenpix-custom-domain-edge
pnpm --filter @keenpix/delivery-edge exec cf workers get keenpix-custom-domain-edge
pnpm --filter @keenpix/delivery-edge exec cf workers versions get <active-version> --worker-id keenpix-custom-domain-edge --include modules
```

Keep the complete active modules, hashes, bindings, secret names, runtime
settings, observability, and full zone route table in a private rollback snapshot.
The version API returns module content as base64; decode before hashing. Never
read secret values or include provider snapshots in public Git.

The route table is managed separately, including no-Worker exceptions. Confirm
it points to this Worker. Do not rename the Worker, use an inactive similarly
named target, or apply a partial route table to make a release appear successful.
If CLI authorization fails, preserve the current deployment and resolve access.

## Build and verify

```sh
pnpm --filter @keenpix/delivery-edge test
pnpm --filter @keenpix/delivery-edge typecheck
pnpm --filter @keenpix/delivery-edge build
pnpm --filter @keenpix/delivery-edge run upload --dry-run
```

`build` writes `.cloudflare/output/v0/` without publishing. Review its default
Worker bundle, Worker configuration, and root build context. The Vite production
mode must also be passed when uploading this prebuilt artifact. Type generation
writes ignored `.cloudflare/types/`; tests use their own configuration and do
not start the production Vite plugin or require production secrets.

`cloudflare.config.ts` declares the existing variables and Analytics Engine
binding. Its upload metadata preserves undeclared plain-text/JSON bindings,
matching the former variable-preservation setting. Explicit declared values
still override the corresponding bindings. Existing secrets are retained by the
version upload. Inspect the uploaded version to verify every binding rather
than assuming preservation from a successful command.

## Upload, inspect, then deploy an exact version

```sh
pnpm --filter @keenpix/delivery-edge run upload --message "Reviewed delivery edge release"
pnpm --filter @keenpix/delivery-edge exec cf workers versions get <uploaded-version> --worker-id keenpix-custom-domain-edge --include modules
pnpm --filter @keenpix/delivery-edge run deploy --versions '[{"version_id":"<uploaded-version>","percentage":100}]'
```

Uploading creates a version without moving traffic. Compare every uploaded
module against the reviewed build and verify bindings, secrets, and settings
before deploying the exact returned version. The deploy script changes version
traffic only. Avoid `cf deploy` and `cf workers triggers deploy` here: those
commands also reconcile externally managed routes and triggers.

After deployment, verify the active version, source hashes, bindings, Worker
settings, and full route table. Use marked operator requests only against a
known internal/test project. Verify a cache miss and subsequent hit return the
same image, then reconcile project-attributed Analytics Engine events and app
rollups. A non-image 404 smoke does not establish image delivery or accounting.
Keep all project identities, URLs, and provider readouts private.

## Accounting and coverage

When Content-Length is valid, byte accounting keeps its header fast path. When
it is absent or invalid, the Worker counts chunks in a pass-through stream and
records one event after transfer settles, including partial bytes on cancellation.
It does not buffer the complete image. HEAD/bodyless responses record zero bytes.
These are observed response bytes, not proof that a client received or viewed them.

Origin deliveries are already recorded by the origin; usage adds only successful
`edge` stage bytes from edge rollups. Confirm this separation during validation
so misses are not counted twice. Analytics Engine can sample; queries must use
`_sample_interval` weighting. Correct future missing-length accounting does not
reconstruct historical zero-byte events or authorize retroactive customer charges.
First-image activation remains an origin-only observation with its own exclusions.

## Rollback

```sh
pnpm --filter @keenpix/delivery-edge run deploy --versions '[{"version_id":"<previous-version>","percentage":100}]'
```

Use the captured previous version after reviewing its secret/binding compatibility.
Dry-run the command before a planned rollback rehearsal. Verify the resulting
active version, source, settings, and routes. Restore any setting outside the
version separately if needed. Never delete the Worker, recreate its routes, or
rotate secrets to roll back code. Retain the private baseline and receipt.

References: [Cloudflare project commands](https://developers.cloudflare.com/cf/projects/),
[programmatic configuration](https://developers.cloudflare.com/cf/projects/cloudflare-config/),
[streaming](https://developers.cloudflare.com/workers/runtime-apis/streams/),
and [Analytics Engine sampling](https://developers.cloudflare.com/analytics/analytics-engine/sampling/).
