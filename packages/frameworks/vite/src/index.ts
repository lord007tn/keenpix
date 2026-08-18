import type { KeenpixConfig } from '@keenpix/core'

export * from '@keenpix/core'

export const KEENPIX_VIRTUAL_MODULE_ID = 'virtual:keenpix'
const RESOLVED_KEENPIX_VIRTUAL_MODULE_ID = `\0${KEENPIX_VIRTUAL_MODULE_ID}`

export function keenpix(config: KeenpixConfig) {
  return {
    name: 'keenpix',
    resolveId(id: string) {
      if (id === KEENPIX_VIRTUAL_MODULE_ID) {
        return RESOLVED_KEENPIX_VIRTUAL_MODULE_ID
      }
    },
    load(id: string) {
      if (id === RESOLVED_KEENPIX_VIRTUAL_MODULE_ID) {
        return [
          "import { createKeenpix } from '@keenpix/core'",
          `export const config = ${JSON.stringify(config)}`,
          'export const keenpix = createKeenpix(config)',
          'export default keenpix',
        ].join('\n')
      }
    },
  }
}

export { createImageAttributes as createViteImageAttributes } from '@keenpix/core'
