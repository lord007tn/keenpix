import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import mdx from 'fumadocs-mdx/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import packageJson from './package.json' with { type: 'json' }

const config = defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
  server: {
    port: 3000,
  },
  ssr: {
    // These dependencies load package-relative runtime assets or CommonJS
    // entrypoints that cannot be relocated into Nitro's ESM chunks.
    external: ['bullmq', 'svgo'],
  },
  plugins: [
    mdx(),
    devtools(),
    nitro(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      router: {
        routeFileIgnorePattern: '\\.test\\.[cm]?[jt]sx?$',
      },
    }),
    babel({
      presets: [reactCompilerPreset()],
    }),
    viteReact(),
  ],
})

export default config
