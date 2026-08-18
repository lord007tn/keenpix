import type { KeenpixConfig, KeenpixImageInput } from '@keenpix/core'
import { createVueImageProps } from '@keenpix/vue'

export * from '@keenpix/core'
export * from '@keenpix/vue'

interface VitePressApp {
  component(name: string, component: unknown): void
  provide(key: string, value: unknown): void
}

interface VitePressTheme {
  enhanceApp?: (context: { app: VitePressApp }) => unknown
  [key: string]: unknown
}

export function createVitePressImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  return createVueImageProps(config, input)
}

export function withKeenpixTheme(
  theme: VitePressTheme,
  config: KeenpixConfig,
  component?: unknown,
) {
  return {
    extends: theme,
    enhanceApp(context: { app: VitePressApp }) {
      context.app.provide('keenpix', config)
      if (component) {
        context.app.component('KeenpixImage', component)
      }
    },
  }
}
