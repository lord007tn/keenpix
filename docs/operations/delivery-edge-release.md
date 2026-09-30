# Delivery edge release

The package is named `@keenpix/delivery-edge`; the existing hosted Worker is
`keenpix-custom-domain-edge`. Renaming the package does not rename or move a
deployed Worker. Confirm the serving Worker in the account's zone route table
before releasing. Do not deploy to a similarly named inactive Worker or move
traffic to make a deployment appear successful.

## Capture the baseline

Use an existing authorized Cloudflare session or deployment credential. Keep
credentials and provider snapshots outside Git. Application analytics and custom
hostname provisioning tokens are separate from Worker deployment credentials;
a valid token can still lack permission to read Worker source.

Record the active version, complete source, variables, secret names, bindings,
compatibility date/flags, observability, placement, limits, trigger configuration,
and the complete zone route table, including routes with no Worker. Preserve a
private rollback snapshot and source hashes. Never copy secret values into a
report or replace existing secrets as part of source reconciliation.

The dashboard's **Edit code** view can provide the complete deployed module
through ordinary editor Select All and Copy controls. Confirm the editor has
focus first: selecting a page is not copying its source. If an embedded editor
cannot be addressed through an element locator, supported keyboard input to the
already-focused editor is an alternative. Do not inspect hidden application
state, extract browser session credentials, or treat the visible lines as the
complete module. Check all modules in the Explorer and preserve their filenames.

Rebuild the matching historical repository revision with the installed Wrangler
version and compare the complete output. Record raw hashes separately from any
comparison that normalizes line endings or source-map comments. Review every
meaningful difference from the intended release. A source match establishes a
baseline; it does not prove deployment authorization or a successful release.

## Build and review

```sh
pnpm --filter @keenpix/delivery-edge test
pnpm --filter @keenpix/delivery-edge typecheck
pnpm --filter @keenpix/delivery-edge build
```

`build` performs a Wrangler dry run and writes the bundled module to `dist`.
It does not publish a version. Review that bundle and the configuration diff
before approval. Preserve the existing compatibility date unless a runtime
upgrade is independently intended and tested.

The configuration deliberately omits `route` and `routes`: the zone route table
is managed separately. `keep_vars` preserves dashboard variables not present in
the file; variables explicitly declared in the file still supply their values.
Secrets are retained by Cloudflare. Workers.dev and preview URLs remain disabled.
Check bindings and settings explicitly; `keep_vars` is not a blanket promise to
preserve every provider setting.

## Release after review

For an existing CLI identity, verify the intended account and Worker first:

```sh
pnpm --filter @keenpix/delivery-edge exec wrangler whoami
pnpm --filter @keenpix/delivery-edge exec wrangler deployments list
pnpm --filter @keenpix/delivery-edge exec wrangler versions list
```

Select the account through the approved local `CLOUDFLARE_ACCOUNT_ID` setting;
do not commit account identifiers or credentials. If authorization fails, stop
and use an already authorized method. Do not silently create a preview account,
create a new token, widen permissions, or switch deployment targets.

Only after the exact source/configuration change is approved:

```sh
pnpm --filter @keenpix/delivery-edge deploy
```

An authenticated dashboard is an alternative release interface. Open the exact
serving Worker's editor, confirm the active version still matches the captured
baseline, and replace the complete module with the reviewed dry-run bundle.
Review the pending diff and any required variable change before selecting
**Deploy**. Preserve the other modules, bindings, routes and settings. For the
first-image contract, `APP_ORIGIN` must be configured before publishing the code
that uses it; editor source replacement alone does not apply Wrangler variables.
Do not claim this path has deployed successfully merely because its button is
visible or the source can be edited.

After either method, verify the new active version and recapture its complete
source. Compare it with the approved bundle and check that the baseline routes,
bindings and unrelated settings are unchanged. Use only explicitly excluded
internal/test projects and marked operator requests for any smoke test. Record
the exact version, source hash, configuration differences and observed result
privately. Worker verification does not prove app/transform deployment, database
migration completion or activation coverage.

## Rollback

Retain the original active version and private source/settings snapshot. After
rollback approval, use the dashboard deployment rollback control or the existing
authorized Wrangler `rollback <version-id>` command. Verify the resulting active
version and source, plus the preserved routes and bindings. Restore a reviewed
setting separately if it is outside the versioned code/bindings. Do not delete
the Worker, recreate routes, or rotate secrets to roll back a code release.

References: [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/),
[Worker commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/),
and [Worker permissions](https://developers.cloudflare.com/workers/authorization/workers/).
