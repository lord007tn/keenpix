# Releasing Keenpix

Keenpix publishes a GitHub release and GHCR Docker images from a semantic-version tag.
This is the maintainer checklist for cutting one.

## Managed-cloud production gate

Production Coolify currently tracks `master` and has no GitHub webhook. A push to
`master` runs CI and publishes the `master`/`latest` GHCR tags, but it does not
redeploy keenpix.com. Run `pnpm health`, browser smoke tests, SEO drift, and the
cloud integration checklist; then manually deploy the reviewed `master` commit
to the `keenpix` Coolify application and record its deployment id and rollback
evidence. Production uses `docker-compose.production.yml`.

The public v0.2.0 release record remains in `docs/releases/v0.2.0.md`.

## 1. Pre-flight (on `master`, clean tree)

- [ ] `git switch master && git pull`
- [ ] `pnpm install` (lockfile up to date)
- [ ] `pnpm health` — lint, typecheck, test, knip, doctor, and build must all pass. CI
      runs the same gate on every push.

## 2. Version

- [ ] Bump `version` in `package.json` to the new `MAJOR.MINOR.PATCH`.
- [ ] Commit: `chore(release): vX.Y.Z`.

Release notes are generated automatically by
[changelogithub](https://github.com/antfu/changelogithub) from the Conventional Commit
messages since the previous tag. Keep `CHANGELOG.md` and the release-specific notes under
`docs/releases/` aligned with material product and operational changes. Write commits as
`feat: …`, `fix: …`, etc.; anything that doesn't match a recognized type is left out of
the generated notes, so granular, well-typed commits make the best release.

## 3. Tag and push

- [ ] `git tag vX.Y.Z`
- [ ] `git push origin master --tags`

The tag must be a valid semver (`v0.1.0`, `v0.1.0-rc.1`); both workflows reject anything
else.

## 4. What CI does automatically

| Workflow | Trigger | Result |
| --- | --- | --- |
| [`release.yml`](.github/workflows/release.yml) | tag `v*` | Runs `pnpm release:notes` (changelogithub) to generate notes from Conventional Commits since the previous tag and publish the GitHub release. |
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
- `package.json` `version` should match the tag you push. Keep release-worthy changes in
  Conventional Commits so changelogithub can categorize them.
