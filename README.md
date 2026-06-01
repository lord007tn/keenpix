# Keenpix

A self-hosted image-optimization service — a drop-in, open-source alternative to ImageKit/imgix. Point it at your origin, request a URL, and Keenpix fetches the image, transforms it with [sharp](https://sharp.pixelplumbing.com/), caches it to disk, and serves it CDN-ready.

- **Transform API** — `GET /img/https://origin.example/photo.jpg?project=…&w=…&fmt=…` → resize / re-encode (AVIF/WebP/JPEG/PNG) / blur, content-negotiated, immutably cacheable.
- **No API keys** — access is gated entirely by each project's **domain allowlist**. An empty allowlist fails closed (403), so a fresh project is never an open proxy.
- **Projects** — each project = one origin + an allowlist + its own request logs.
- **Built-in analytics** — requests, bandwidth saved, cache hit-rate, formats, latency — from the request log.
- **Auth** — seeded super admin, copyable staff invitations, and optional SMTP-backed invite/test emails.
- **Hardened for the open internet** — SSRF guard (allowlist + private/loopback/link-local/CGNAT + IPv4-mapped-IPv6 + DNS-rebinding blocks), decompression-bomb + response-size + concurrency limits.

Stack: TanStack Start (React 19, SSR) · Prisma 7 + PostgreSQL · sharp · Docker. MIT licensed.

---

## Quick start (Docker — the self-host path)

Requires Docker + Docker Compose.

```bash
cp .env.example .env
# Generate a signing secret and put it in .env (compose refuses to start without one):
#   openssl rand -hex 32   →   BETTER_AUTH_SECRET=...
# Set POSTGRES_PASSWORD, KEENPIX_SUPER_ADMIN_EMAIL, and KEENPIX_SUPER_ADMIN_PASSWORD in .env.
docker compose up -d
```

The app comes up on **http://localhost:3000** by default. Set `KEENPIX_PORT` to publish a different host port, `BETTER_AUTH_URL` to your public base URL, or `KEENPIX_IMAGE` to a pinned image tag/digest. Compose runs Postgres, applies migrations on boot, seeds the default org and super admin user, and exposes `/api/health` for the container healthcheck. Docker/self-host mode sets `KEENPIX_SELF_HOST=true`, so `/` shows a private self-host splash with links into `/app` and `/docs`; the dashboard, API, and docs are served, while public marketing and LLM export routes are not.

The Docker image entrypoint accepts `start` (default), `migrate`, and `seed`. For normal installs, leave the default `start`; it applies migrations, seeds bootstrap data, then starts the app. Set `KEENPIX_RUN_MIGRATIONS=false` or `KEENPIX_RUN_SEED=false` only when an external deployment workflow owns those steps.

## Quick start (Coolify)

Use [docker-compose.coolify.yml](./docker-compose.coolify.yml) for a Coolify service stack.

1. In Coolify, create a new resource with **Docker Compose Empty**.
2. Paste the contents of `docker-compose.coolify.yml`.
3. Set your public domain on the `app` service. Coolify will generate `SERVICE_URL_KEENPIX_3000`, database credentials, the auth secret, and the super-admin password. If you use a custom domain and Coolify does not put it in `COOLIFY_URL`, set `BETTER_AUTH_URL` and `BETTER_AUTH_TRUSTED_ORIGINS` to that public URL.
4. Optionally change `KEENPIX_SUPER_ADMIN_EMAIL` from the default `admin@example.com`.
5. Deploy, then sign in with `KEENPIX_SUPER_ADMIN_EMAIL` and the generated `SERVICE_PASSWORD_64_ADMIN` value shown in Coolify's environment variables.

The Coolify stack uses the pinned `ghcr.io/lord007tn/keenpix:v0.1.0` image, keeps Postgres private, persists database/cache volumes, runs migrations and seed on app startup, and exposes the app through Coolify's proxy on container port `3000`.

If an earlier Coolify deploy failed with a Postgres 18 message about existing data in `/var/lib/postgresql/data`, remove the failed `keenpix-pg` volume from that Coolify resource or recreate the resource before deploying this compose. The Coolify compose now uses a fresh `keenpix_pg18` volume mounted at `/var/lib/postgresql`, which is the Postgres 18-compatible layout.

**First run (empty database):**
1. Open http://localhost:3000 and sign in with `KEENPIX_SUPER_ADMIN_EMAIL` and `KEENPIX_SUPER_ADMIN_PASSWORD`.
2. Create a **project** (its origin hostname is added to the allowlist automatically).
3. In **Settings**, invite staff by copying an invitation link, and optionally configure SMTP to send invitation/test emails.
4. Add any other image hosts under **Allowed hosts**, and copy the **Project ID** (shown at the top of Settings).
5. Request an image — **no API key**, just make sure the source host is allowlisted:
   ```bash
   curl -o out.webp \
     "http://localhost:3000/img/https://your-cdn.example.com/photo.jpg?project=<PROJECT_ID>&w=600&fmt=webp"
   ```

---

## Quick start (local dev)

Requires Node 22+, pnpm, and a PostgreSQL database.

```bash
pnpm install
cp .env.example .env          # point DATABASE_URL at your Postgres
                              # and set KEENPIX_SUPER_ADMIN_EMAIL / KEENPIX_SUPER_ADMIN_PASSWORD
pnpm db:migrate               # apply schema
pnpm db:seed                  # seed default org + admin user
pnpm dev                      # http://localhost:3000
```

---

## Configuration

All via environment variables (see `.env.example`):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string. |
| `POSTGRES_PASSWORD` | ✅ (compose) | Password for the bundled Compose Postgres service. Compose refuses to start without it. |
| `BETTER_AUTH_SECRET` | ✅ (prod) | Session signing secret — `openssl rand -hex 32`. The app refuses to boot in production with a missing or known-weak/placeholder value. |
| `BETTER_AUTH_URL` | – | Public base URL (default `http://localhost:3000`). HTTPS enables secure cookies automatically. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | – | Comma/whitespace separated origins accepted by Better Auth. Set this to your proxy/custom domain if login returns `Invalid origin`. |
| `KEENPIX_APP_URL` | – | Canonical URL used for hosted docs metadata and generated OG/LLM links. Defaults to `BETTER_AUTH_URL`. |
| `KEENPIX_SUPER_ADMIN_EMAIL` | ✅ | Email for the seeded super admin account. |
| `KEENPIX_SUPER_ADMIN_PASSWORD` | ✅ | Password for the seeded super admin account. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | – | Optional SMTP defaults used when database SMTP settings are not enabled. |
| `SMTP_USER` / `SMTP_PASSWORD` | – | Optional SMTP credentials. |
| `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | – | Optional SMTP sender defaults. |
| `KEENPIX_SELF_HOST` | – | Set `true` to run app-only self-host mode. Docker images default this to `true`. |
| `KEENPIX_RUN_MIGRATIONS` / `KEENPIX_RUN_SEED` | – | Docker entrypoint controls for running migrations and bootstrap seed before app start. Defaults to `true`. |
| `KEENPIX_CACHE_DIR` | – | Disk cache location (default `./.keenpix-cache`). |
| `KEENPIX_CACHE_MAX_BYTES` | – | LRU eviction cap (default 2 GB). |
| `KEENPIX_MEMORY_CACHE_MAX_BYTES` | – | In-process hot variant LRU cap; set `0` to disable (default 64 MB). |
| `KEENPIX_MAX_ORIGIN_BYTES` | – | Reject origin responses larger than this (default 50 MB). |
| `KEENPIX_MAX_INPUT_PIXELS` | – | Decompression-bomb ceiling (default ~50 MP). |
| `KEENPIX_MAX_DIMENSION` | – | Longest output side when a request omits `w`/`h` (default 4096). |
| `KEENPIX_ORIGIN_TIMEOUT_MS` | – | Per-attempt origin fetch timeout; a slow origin returns 504 (default 10000). |
| `KEENPIX_MAX_CONCURRENCY` / `KEENPIX_MAX_QUEUE` | – | Concurrent transform jobs / queue depth before shedding 503. |

---

## Transform API

```
GET /img/<origin-url>?project=<id>&w=&h=&q=&fmt=&fit=&dpr=&blur=
```

**No authentication header.** Access is controlled by the project's allowlist — the request only succeeds if the source URL's host is listed under that project's **Allowed hosts**.

| Param | Meaning |
|---|---|
| `project` | Project id (copy it from **Settings → Project ID**). Its allowlist is the gate. |
| path source | Source image URL after `/img/` — its host must be on the project allowlist. |
| `w` / `h` | Target width/height (1–5000, never upscaled). |
| `q` | Quality 30–100 (default 75). |
| `fmt` | `auto` (Accept-negotiated), `avif`, `webp`, `jpeg`, `png`. |
| `fit` | `cover` / `contain` / `fill` / `inside`. |
| `dpr` | Device pixel ratio 1–3. |
| `blur` | Gaussian blur sigma. |

Simple source URLs can be written directly in the path. If the source URL contains its own `?` or `#`, URL-encode the source before appending Keenpix transform parameters.

Responses set `Cache-Control: public, max-age=31536000, immutable` and `Vary: Accept`, so a CDN can cache each image variant once you configure it to cache `/img/*` with the full query string. The source URL lives in the path so Cloudflare and other CDNs can still see the source file extension; use explicit `fmt` values unless your CDN can cache separate `Accept` variants.

**Failure modes:**

| Status | When |
|---|---|
| **400** | Missing source URL or `?project`, or a malformed/non-http(s) URL |
| **403** | Source host not on the project allowlist (or the allowlist is empty), or it resolves to a private/loopback/link-local/CGNAT/multicast address (incl. IPv4-mapped IPv6 and DNS-rebinding) |
| **404** | Unknown `project` id |
| **413** | Origin image exceeds `KEENPIX_MAX_ORIGIN_BYTES` |
| **502** | Origin unreachable, errored, returned a non-image body, or too many redirects |
| **503** | Transform queue saturated (back-pressure) |
| **504** | Origin timed out |

In an `<img>`, any non-200 shows as a broken image — a 403 almost always means the source host isn't on the allowlist.

---

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Dev server on :3000 |
| `pnpm build` / `pnpm preview` | Production build / preview |
| `pnpm test` | Unit tests (vitest) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm fix` | Biome check / auto-fix |
| `pnpm knip` / `pnpm doctor` | Dead-code and React health scans |
| `pnpm health` | Full local quality gate: lint, typecheck, tests, knip, doctor, build |
| `pnpm db:migrate` / `db:seed` | Prisma migrate / seed |

---

## Releases and Docker Images

Keenpix uses semantic version tags in the form `vMAJOR.MINOR.PATCH` (for example `v0.1.0`). Pushing a valid tag runs [`changelogithub`](https://github.com/antfu/changelogithub) to create GitHub release notes, and the Docker workflow builds GHCR images for the self-hosted app.

```bash
git tag v0.1.0
git push origin v0.1.0
```

The compose file defaults to `ghcr.io/lord007tn/keenpix:latest`; override with `KEENPIX_IMAGE` if you want a pinned tag or digest.

---

## Hosted Docs

Hosted builds serve the marketing page, Fumadocs documentation, docs search, `llms.txt`, `llms-full.txt`, and generated docs OG images. Self-hosted builds serve the dashboard, API, and documentation, but skip the marketing landing page and LLM export routes.

---

## Architecture

Four one-way layers: **route → server fn (`*Fn`) → action (pure) → data-access (Prisma)**. The transform endpoint (`/img/*`) is a route handler calling the pure sharp/SSRF/cache actions directly. Every record is `orgId`-scoped (self-host runs as a single org; SaaS-ready later).

```
src/
  routes/        UI + API route handlers (/img/*, /api/health, /api/auth)
  functions/     server fns (auth-gated via middleware)
  actions/       pure logic — transform pipeline, SSRF guard
  data-access/   Prisma queries
  lib/           sharp, cache, auth
```

---

## License

[MIT](./LICENSE).
