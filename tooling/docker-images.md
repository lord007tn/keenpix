# Manual image builds

The Docker workflow runs only through `workflow_dispatch` and never deploys.
Its defaults remain a non-publishing build of app, transform, worker and docs.
With `publish=true`, the default `all` scope keeps the existing branch/semver/
latest aliases and adds a source/run/attempt-specific tag.

Choose `app-transform` to build only those two images. This scope rejects tag
refs and publishes only source/run/attempt tags, leaving existing release
aliases unchanged. Supply public app URL, GTM and GA inputs explicitly when
needed; empty defaults preserve builds without analytics configuration. These
inputs are public values embedded in the app bundle, never secrets. The optional
VERSION override is restricted to this scope. It does not change the app's
package-based public version or prove its source revision.

Published builds upload one receipt per selected image and a verified manifest.
Receipts bind source SHA, run ID, run attempt, scope, repository, index digest,
linux/amd64 platform and a hash of relevant supplied build arguments. The OCI revision
label also records the source SHA. Registry platform/config verification remains
a separate release check; receipts are build-output records, not independent
registry attestations or deployment evidence.

The aggregate verifier rejects missing/duplicate images and receipts from other
scopes, repositories, sources or workflow attempts. A scoped manifest always has
`completeImageSet: false`; it must not qualify as a full image release. `all`
requires all four receipts. Neither manifest proves package publication,
production acceptance or rollback readiness. Existing tag/package release checks
remain separate; no release or promotion workflow consumes these artifacts
automatically. Non-publishing builds do not generate published-image receipts.

Run `node --test tooling/docker-images.test.mjs` for the contract checks. The
workflow invokes the same `plan`, `receipt` and `verify` commands that the tests
exercise. Build input values are not stored in receipts; retain the authorized
dispatch inputs with private release evidence when preparing a deployment.
