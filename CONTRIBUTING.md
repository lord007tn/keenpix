# Contributing to Keenpix

Thanks for helping improve Keenpix. This guide gets a fresh clone to a verified PR.

## Code of Conduct

By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Setup

Prerequisites: Node 22+, pnpm 10, Docker or a local PostgreSQL database.

```bash
git clone https://github.com/lord007tn/keenpix.git
cd keenpix
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The app runs at <http://localhost:3000>.

## Self-Hosted Mode

Docker images are app-only by default. Set `KEENPIX_SELF_HOST=true` when running a self-hosted instance so marketing pages, docs search, docs pages, LLM exports, and docs OG images are not served.

```bash
docker compose up --build
```

## Workflow

1. Branch from `master`.
2. Keep changes focused.
3. Add or update tests for transform, SSRF, cache, auth, or data-access behavior.
4. Verify before opening a PR:

```bash
pnpm lint
pnpm run typecheck
pnpm test
pnpm build
```

## Commit and PR Style

Use clear Conventional Commit-style prefixes where they fit: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, and `chore:`.

PRs should describe what changed, why it changed, and how it was verified. Include screenshots for meaningful UI changes and reproduction steps for bugs.

## Releasing

Maintainers cut releases from a semver tag. See [RELEASE.md](RELEASE.md) for the full checklist — version bump, `CHANGELOG.md` section, tagging, and post-release verification of the GHCR image, health route, and seed flow.

## Security

Do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
