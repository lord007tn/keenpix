import { afterEach, describe, expect, it, vi } from 'vitest'

// Load deployment.ts with a controlled env so isCloud() can be asserted in
// isolation. vi.doMock (not hoisted) must run before the dynamic import.
async function loadDeployment(mode: string | undefined) {
  vi.resetModules()
  vi.doMock('@/env/server', () => ({ env: { KEENPIX_MODE: mode } }))
  return await import('./deployment')
}

afterEach(() => {
  vi.doUnmock('@/env/server')
  vi.resetModules()
})

describe('deployment mode', () => {
  it('never enables cloud when KEENPIX_MODE is unset (self-host is the default)', async () => {
    const { isCloud } = await loadDeployment(undefined)
    expect(isCloud()).toBe(false)
  })

  it('enables cloud only for the exact value "cloud"', async () => {
    expect((await loadDeployment('cloud')).isCloud()).toBe(true)
    expect((await loadDeployment('selfhost')).isCloud()).toBe(false)
    expect((await loadDeployment('CLOUD')).isCloud()).toBe(false)
    expect((await loadDeployment('bogus')).isCloud()).toBe(false)
  })
})
