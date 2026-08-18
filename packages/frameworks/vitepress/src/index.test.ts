import { describe, expect, it, vi } from 'vitest'
import { withKeenpixTheme } from './index.js'

describe('withKeenpixTheme', () => {
  it('preserves the base theme hook and registers Keenpix', async () => {
    const baseEnhanceApp = vi.fn()
    const component = {}
    const app = { component: vi.fn(), provide: vi.fn() }
    const theme = withKeenpixTheme(
      { enhanceApp: baseEnhanceApp, Layout: 'layout' },
      { baseUrl: 'https://img.test' },
      component,
    )

    await theme.enhanceApp({ app })

    expect(theme.extends).toMatchObject({ enhanceApp: baseEnhanceApp })
    expect(baseEnhanceApp).not.toHaveBeenCalled()
    expect(app.provide).toHaveBeenCalledWith('keenpix', {
      baseUrl: 'https://img.test',
    })
    expect(app.component).toHaveBeenCalledWith('KeenpixImage', component)
  })
})
