# Source Structure

Domain-first structure for the Keenpix app and transform API.
One-way dependency flow:

```
routes/  →  functions/  →  actions/  →  data-access/  →  db / lib
(thin UI)   (server Fns)   (use cases)    (Prisma)
```

- `routes/` — TanStack Router file-based routes (UI + API endpoints). Keep thin; call `functions/`.
- `functions/` — Public server boundary for API routes, React Query, and UI calls. `createServerFn` exports end with `Fn`; HTTP adapters use explicit request-handler names such as `handleTransformRequest`.
- `actions/` — Use-case orchestration called by `functions/`. Actions can call `data-access` and `lib`, but should not build `Response` objects or import route/UI code. Plain verb names.
- `data-access/` — Pure DB operations and DB health probes only: `getX` / `listX` / `createX` / `updateX` / `deleteX` / `checkX`.
- `db/` — Prisma client bootstrap.
- `errors/` — Shared error classes and normalization helpers. Domain errors live here, not inside actions/lib modules.
- `lib/` — external integrations and reusable infrastructure: `auth/` (better-auth), `sharp/` (transform wrapper), `transform/` (SSRF/origin/cache/queue helpers), `cdn/` (cache-control/cache-key/cache storage), `logger`.
- `components/ui/` — frozen shadcn components (don't hand-edit except to add `cva` variants).
- `components/app/` — shared app components (sidebar, topbar, stat cards, chart wrappers).
- `features/` — domain modules (components/schemas/types) for analytics, projects, logs.
- `shared/` — cross-cutting types, constants, errors, formatters.
- `stores/` — client-side state.
- `styles.css` — global CSS: shadcn OKLCH tokens + `success`/`warning`/`info` + `@theme inline`.

## Naming rules
- Data-access: `getX`, `listX`, `createX`, `updateX`, `deleteX`.
- Server functions: `createServerFn` exports end with `Fn` (e.g. `listProjectsFn`); HTTP adapters use `handleXRequest`.
- Actions: plain verbs/use-case names (e.g. `optimizeProjectImage`).
