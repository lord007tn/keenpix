# Agent Notes

- Prefer TypeScript inference. Do not force types with casts, explicit generics, or return annotations unless the boundary genuinely needs it and narrowing cannot express the type.
- Keep reused parsing, formatting, and response data shaping in focused helpers or utils when the same shape appears in more than one place or has validation edge cases. Do not extract one-off route/view assembly only to make code look abstract, and avoid `to*` mapper names; prefer names that describe the domain result.
- Use normal top-level imports. Do not use dynamic `import()` unless the runtime boundary specifically requires lazy loading.
- Keep styling on the shadcn token set. Prefer existing semantic tokens such as `primary`, `secondary`, `muted`, `accent`, and `destructive` before adding custom color declarations.
