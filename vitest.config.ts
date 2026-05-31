import tsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Lightweight unit-test config — deliberately does NOT load the TanStack Start /
// Nitro plugins so the security-critical pure functions test in isolation.
export default defineConfig({
  plugins: [tsConfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
