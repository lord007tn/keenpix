# Releasing Keenpix

Keenpix v0.3 ships four deployable services, a GitHub release, and a family of
public npm packages. Docker publishing is always manual; pull requests, pushes,
and tag creation never build or publish container images automatically.

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

After the release pull request is merged, the Packages workflow uses Changesets
to open or update the package-version pull request. Merging that generated pull
request publishes the public `@keenpix/*` packages to npm. Confirm the repository
has a valid `NPM_TOKEN` before merging it.

## 3. Tag and publish the GitHub release

On an up-to-date, clean `master`:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

The tag triggers `.github/workflows/release.yml`, which validates semver and
publishes the GitHub release notes. It does not build Docker images.

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
  - the canonical managed CDN path works through the edge;
  - the application hostname does not expose public managed delivery.
- Record image digests, deployment id, rollback target, and screenshots or a
  short recording for user-visible changes in the release pull request.

## Rollback

Roll back all four service image variables to the previously verified release as
one unit. Do not mix app, transform, worker, and docs versions unless a release
note explicitly documents compatibility. Preserve the database and cache
volumes, verify the previous schema is still supported, redeploy, and repeat the
health and transform checks.
