# Agent Notes

- Prefer TypeScript inference. Do not force types with casts, explicit generics, or return annotations unless the boundary genuinely needs it and narrowing cannot express the type.
- Keep reused parsing, formatting, and response data shaping in focused helpers or utils only when the same shape appears in more than one place and has real logic or validation edge cases. Do not extract functions that only return an object literal or forward fields, even if the object shape repeats. Avoid `to*` mapper names; prefer names that describe the domain result when a helper is justified.
- Enforce helper and util folder boundaries strictly:
  - `helpers/<domain>/` folders contain pure, domain-specific composition or data-shaping helpers for the nearest owning layer. They may know domain names such as projects, staff, API keys, or analytics, but they must not perform database queries, network calls, auth checks, routing, rendering, or environment access.
  - `utils/<primitive>/` folders contain pure, generic primitives for the nearest owning layer. They must not know product/domain concepts, import app services, or shape API/UI responses.
  - Do not add flat `*-helpers.ts`, `*-utils.ts`, `helpers/admin.ts`, or other broad catch-all helper files. Create a domain or primitive folder and name files by the specific behavior they hold.
  - Keep one-off route handlers, component view assembly, and single-use transformations in the owning module until there is real reuse or a clear validation edge case.
- Function complexity and lines-per-function lint rules are intentionally disabled. Prefer readable local control flow over splitting code only to satisfy complexity metrics.
- Use normal top-level imports. Do not use dynamic `import()` unless the runtime boundary specifically requires lazy loading.
- Keep styling on the shadcn token set. Prefer existing semantic tokens such as `primary`, `secondary`, `muted`, `accent`, and `destructive` before adding custom color declarations.
