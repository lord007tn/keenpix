# Releasing Keenpix

Keenpix publishes a GitHub release and GHCR Docker images from a semantic-version tag.
This is the maintainer checklist for cutting one.

## 1. Pre-flight (on `master`, clean tree)

- [ ] `git switch master && git pull`
- [ ] `pnpm install` (lockfile up to date)
- [ ] `pnpm health` — lint, typecheck, test, knip, doctor, and build must all pass. CI
      runs the same gate on every push.

## 2. Version and changelog

- [ ] Bump `version` in `package.json` to the new `MAJOR.MINOR.PATCH`.
- [ ] Add a section to `CHANGELOG.md` titled exactly `## [vX.Y.Z] - YYYY-MM-DD`. The
      release workflow extracts the notes between this heading and the next `## [`
      heading, so the format must match — including the leading `v`.
- [ ] Commit: `chore(release): vX.Y.Z`.

## 3. Tag and push

- [ ] `git tag vX.Y.Z`
- [ ] `git push origin master --tags`

The tag must be a valid semver (`v0.1.0`, `v0.1.0-rc.1`); both workflows reject anything
else.

## 4. What CI does automatically

| Workflow | Trigger | Result |
| --- | --- | --- |
| [`release.yml`](.github/workflows/release.yml) | tag `v*` | Reads the matching `CHANGELOG.md` section and creates the GitHub release (`gh release create --verify-tag`). Fails if no `## [vX.Y.Z]` section exists. |
| [`docker.yml`](.github/workflows/docker.yml) | tag `v*` | Builds and pushes `ghcr.io/lord007tn/keenpix:vX.Y.Z` and `:vX.Y`. |
| [`docker.yml`](.github/workflows/docker.yml) | push to `master` | Builds and pushes `:latest` (and `:master`). |

`latest` follows the `master` branch, not the tag. Pin a specific `vX.Y.Z` (or a digest)
in production via `KEENPIX_IMAGE`.

## 5. Post-release verification

Pull the published image and confirm the deploy path works end to end:

- [ ] `docker pull ghcr.io/lord007tn/keenpix:vX.Y.Z`
- [ ] Boot it against a fresh Postgres, e.g.
      `KEENPIX_IMAGE=ghcr.io/lord007tn/keenpix:vX.Y.Z docker compose up -d`.
- [ ] **Migrations + seed ran:** `docker compose logs app` shows
      `Applying database migrations` then `Seeding bootstrap data`. The entrypoint runs
      `prisma migrate deploy` and `prisma db seed` unless `KEENPIX_RUN_MIGRATIONS` /
      `KEENPIX_RUN_SEED` are `false`.
- [ ] **Health route:** `curl -fsS http://localhost:3000/api/health` returns
      `{"ok":true,…}` with `checks.database.ok` true. Compose also gates the container on
      this endpoint.
- [ ] **Sign-in:** log in as `KEENPIX_SUPER_ADMIN_EMAIL`.
- [ ] **Transform:** request an allowlisted `/img/…` URL — expect `200`, a `MISS` on the
      first request and a `HIT` on the second.

## Notes

- A pre-release tag (`vX.Y.Z-rc.1`) builds and publishes `:vX.Y.Z` / `:vX.Y` the same way.
  It does not move `:latest`, which only tracks `master`.
- `package.json` `version` should match the latest `CHANGELOG.md` heading. A mismatch
  means a release was tagged without the version bump in step 2.
