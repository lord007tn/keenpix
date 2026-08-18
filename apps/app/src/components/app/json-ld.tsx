// Renders structured data as a server-rendered <script type="application/ld+json">
// in the document body so crawlers and AI engines see it in the initial HTML.
// TanStack's route `headScripts` only hydrate client-side, and this version's
// head `meta` type rejects the `script:ld+json` key, so we emit the node here.
// `<` is escaped to < to prevent any "</script>" sequence from closing the
// tag early (standard JSON-LD hardening).
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: app-controlled JSON-LD, with `<` escaped
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
      type="application/ld+json"
    />
  )
}
