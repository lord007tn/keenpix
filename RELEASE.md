# Releasing Keenpix

Keenpix v0.3 ships four container services, one Cloudflare Worker, a GitHub
release, and a family of public npm packages. Docker and Worker deployments are
always manual; pull requests, pushes, and tag creation never build, publish, or
deploy these runtimes automatically.

## 1. Prepare the release pull request

- Merge current `master` into the release branch. Resolve moved files at their
  monorepo paths and confirm `git merge-base --is-ancestor master HEAD` succeeds.
- Run `pnpm install --frozen-lockfile --config.minimumReleaseAge=0`.
- Run `pnpm health`.
- Validate every Compose preset with the required environment variables.
- Build all four Dockerfiles locally without pushing:
  - `apps/app/Dockerfile`
  - `apps/transform/Dockerfile`
  - `apps/worker/Dockerfile`
  - `apps/docs/Dockerfile`
- Run `pnpm --filter @keenpix/delivery-edge build` to bundle the Worker without
  publishing or deploying it.
- Boot the self-host Compose stack with locally built images and verify
  migrations, seed, health endpoints, sign-in, one transform miss, and the
  following cache hit.
- Run the managed URL gate documented in
  `apps/docs/notes/releases/v0.3-legacy-managed-url-removal.md`.
- Keep the pull request ready for review, with CI green and deployment evidence
  attached. Do not leave the release pull request in draft state.

## 2. Version the release

The deployable apps use the product version, while public SDK/framework
packages are versioned through Changesets.

- Set the versions of `@keenpix/app`, `@keenpix/transform-app`,
  `@keenpix/worker`, `@keenpix/docs`, and `@keenpix/delivery-edge` to the
  release version.
- Run `pnpm changeset status` and confirm every public package change has an
  intentional changeset.
- Keep `CHANGELOG.md` and the release note under `apps/docs/notes/releases/`
  aligned with the shipped behavior.
- Commit the version changes as `chore(release): vX.Y.Z`.

The release tag publishes public `@keenpix/*` packages directly through
`.github/workflows/release.yml` and npm trusted publishing. There is no separate
package-version pull request or long-lived `NPM_TOKEN`.

## 3. Tag and publish the GitHub release

On an up-to-date, clean `master`:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

The tag triggers `.github/workflows/release.yml`, which validates semver, runs
the repository and package release gates, verifies the unified version,
publishes public packages through npm trusted publishing, and publishes the
GitHub release notes. It does not build Docker images or deploy the Worker.

## 4. Build and publish Docker images manually

In GitHub Actions, open the **Docker** workflow, choose **Run workflow**, and
select the `vX.Y.Z` tag as the ref. Enable **Publish the built images to GHCR**;
the manual matrix publishes:

- `ghcr.io/lord007tn/keenpix-app:vX.Y.Z` and `:vX.Y`
- `ghcr.io/lord007tn/keenpix-transform:vX.Y.Z` and `:vX.Y`
- `ghcr.io/lord007tn/keenpix-worker:vX.Y.Z` and `:vX.Y`
- `ghcr.io/lord007tn/keenpix-docs:vX.Y.Z` and `:vX.Y`

Run the same workflow manually on `master` only when the reviewed default branch
should update the `master` and `latest` tags. Never add `push` or `pull_request`
Docker build triggers. Leave the publish input disabled for a build-only
verification run.

Deploy `keenpix-delivery-edge` separately and manually from the reviewed tag or
commit with `pnpm --filter @keenpix/delivery-edge deploy`. Before the first route
cutover, run
`pnpm --filter @keenpix/delivery-edge exec wrangler secret put EDGE_SECRET --name keenpix-delivery-edge`,
enter the value used by `CLOUDFLARE_SAAS_EDGE_SECRET`, and verify its name with
`wrangler secret list --name keenpix-delivery-edge`. The deployment identity
must have permission to publish the Worker. Wrangler deliberately does not
declare routes: keep the Cloudflare zone route table in the dashboard or API as
the single source of truth, assign `*/*` to `keenpix-delivery-edge` only after
the secret is present, and preserve more-specific no-Worker routes for Keenpix's
application and origin hosts. Record the new Worker version ID and the previous
verified version ID as its rollback target.

## 5. Post-release verification

- Pin all four `KEENPIX_*_IMAGE` variables to the same `vX.Y.Z` release.
- Boot against a fresh Postgres database and confirm the app logs show database
  migrations followed by bootstrap seed.
- Confirm:
  - app `/api/health` is healthy;
  - transform `/health/ready` is healthy;
  - worker `/health/ready` is healthy;
  - docs `/health` is healthy;
  - the seeded super admin can sign in;
  - an allowlisted transform returns `MISS` and then `HIT`;
  - the `*/*` route is owned by `keenpix-delivery-edge` and the no-Worker
    exclusions still exist;
  - the canonical managed CDN path works through `keenpix-delivery-edge`;
  - a verified customer delivery hostname works through `keenpix-delivery-edge`;
  - the application hostname does not expose public managed delivery.
- Record image digests, deployment id, rollback target, and screenshots or a
  short recording for user-visible changes in the release pull request.

## Rollback

Roll back all four service image variables to the previously verified release as
one unit. Do not mix app, transform, worker, and docs versions unless a release
note explicitly documents compatibility. Preserve the database and cache
volumes, verify the previous schema is still supported, redeploy, and repeat the
health and transform checks.

Roll back `keenpix-delivery-edge` with
`pnpm --filter @keenpix/delivery-edge exec wrangler rollback <VERSION_ID>` using
the recorded previously verified version. Confirm `EDGE_SECRET` is still bound,
retain the same `*/*` and no-Worker route table, then repeat the first-party and
customer delivery smoke tests. Do not delete the previous Worker script or
version until rollback has been rehearsed successfully.
