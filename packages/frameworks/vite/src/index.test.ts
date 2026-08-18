import { describe, expect, it } from 'vitest'
import { KEENPIX_VIRTUAL_MODULE_ID, keenpix } from './index.js'

describe('keenpix Vite plugin', () => {
  it('provides an isomorphic virtual module with serialized public config', () => {
    const plugin = keenpix({ baseUrl: 'https://img.test', projectId: 'site' })
    const resolvedId = plugin.resolveId(KEENPIX_VIRTUAL_MODULE_ID)
    const source = resolvedId ? plugin.load(resolvedId) : undefined

    expect(plugin.name).toBe('keenpix')
    expect(resolvedId).toBe('\0virtual:keenpix')
    expect(source).toContain('createKeenpix')
    expect(source).toContain('https://img.test')
  })
})
