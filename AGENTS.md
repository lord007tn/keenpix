# Agent Notes

- Prefer TypeScript inference. Do not force types with casts, explicit generics, or return annotations unless the boundary genuinely needs it and narrowing cannot express the type.
- Use normal top-level imports. Do not use dynamic `import()` unless the runtime boundary specifically requires lazy loading.
- Keep styling on the shadcn token set. Prefer existing semantic tokens such as `primary`, `secondary`, `muted`, `accent`, and `destructive` before adding custom color declarations.
