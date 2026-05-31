# Source Structure

Domain-first structure for the Keenpix app and transform API.
One-way dependency flow:

```
routes/  →  functions/  →  actions/  →  data-access/  →  db / lib
(thin UI)   (server Fns)   (use cases)    (Prisma)
```

- `routes/` — TanStack Router file-based routes (UI + API endpoints). Keep thin; call `*Fn`.
- `functions/` — Server functions ("fat fn" layer). `createServerFn` + middleware + zod. **Every export ends with `Fn`.**
- `actions/` — Business orchestration. No route objects, no UI, no auth middleware. e.g. transform fetch/queue/cache orchestration in `actions/transform`. Plain verb names.
- `data-access/` — Pure DB operations and DB health probes only: `getX` / `listX` / `createX` / `updateX` / `deleteX` / `checkX`.
- `db/` — Prisma client bootstrap.
- `lib/` — external integrations and reusable infrastructure: `auth/` (better-auth), `sharp/` (transform wrapper), `cdn/` (cache-control/cache-key/cache storage), `logger`.
- `components/ui/` — frozen shadcn components (don't hand-edit except to add `cva` variants).
- `components/app/` — shared app components (sidebar, topbar, stat cards, chart wrappers).
- `features/` — domain modules (components/schemas/types) for analytics, projects, logs.
- `shared/` — cross-cutting types, constants, errors, formatters.
- `stores/` — client-side state.
- `styles.css` — global CSS: shadcn OKLCH tokens + `success`/`warning`/`info` + `@theme inline`.

## Naming rules
- Data-access: `getX`, `listX`, `createX`, `updateX`, `deleteX`.
- Server functions: always end with `Fn` (e.g. `listProjectsFn`).
- Actions: plain verbs (e.g. `optimizeImage`, `summarizeAnalytics`).
