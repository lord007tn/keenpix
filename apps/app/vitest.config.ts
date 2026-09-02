import mdx from 'fumadocs-mdx/vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Keep unit tests on the Node path. The Fumadocs loader is included so tests can
// verify the same processed Markdown collection used by the public server,
// without loading TanStack Start or Nitro.
export default defineConfig({
  plugins: [
    mdx(undefined, { updateViteConfig: false }),
    tsConfigPaths({ projects: ['./tsconfig.json'] }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'scripts/**/*.{test,spec}.ts'],
    // Pin the timezone so time-bucket label math is deterministic and a dev's
    // local zone can never disagree with CI (which runs in UTC).
    env: { TZ: 'UTC' },
  },
})
