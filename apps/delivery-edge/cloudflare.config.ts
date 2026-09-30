import { bindings, defineConfig } from 'cf/config'

export default defineConfig({
  worker: {
    name: 'keenpix-custom-domain-edge',
    compatibilityDate: '2026-08-13',
    entrypoint: 'src/index.ts',
    workersDev: false,
    previewUrls: false,
    observability: { enabled: true, headSamplingRate: 0.1 },
    // Preserve dashboard variables omitted here, matching the former keep_vars.
    unsafe: { metadata: { keep_bindings: ['plain_text', 'json'] } },
    env: {
      APP_ORIGIN: bindings.text('https://keenpix.com'),
      FIRST_PARTY_HOSTNAME: bindings.text('cdn.keenpix.com'),
      TRANSFORM_ORIGIN: bindings.text('https://transform.keenpix.com'),
      EDGE_SECRET: bindings.secret(),
      EDGE_ANALYTICS: bindings.analyticsEngineDataset({
        name: 'keenpix_edge_requests',
      }),
    },
    // The full zone route table, including no-Worker exceptions, is external.
    // Release versions with the upload/deploy scripts without applying triggers.
  },
})
