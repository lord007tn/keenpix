import tsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Keep unit tests on the pure Node path. TanStack Start/Nitro plugins are not
// loaded here, which keeps security-critical pure-function tests isolated.
export default defineConfig({
  plugins: [tsConfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
