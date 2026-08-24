import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  compilers: {
    mdx: true,
  },
  ignoreIssues: {
    'packages/frameworks/eleventy/src/index.ts': ['duplicates'],
  },
  workspaces: {
    'apps/app': {
      entry: [
        'src/router.tsx',
        'src/server.ts',
        'src/routes/**/*.{ts,tsx}',
        'src/functions/**/*.ts',
        'src/actions/**/*.ts',
        'src/server/nitro/**/*.ts',
        'content/**/*.mdx',
        'scripts/**/*.{mjs,ts}',
      ],
      project: ['src/**/*.{ts,tsx}', 'content/**/*.mdx', '*.{ts,tsx}'],
      ignore: [
        'source.config.ts',
        'src/components/mdx.tsx',
        'src/components/ui/**',
      ],
      ignoreDependencies: [
        '@keenpix/docs',
        'bullmq',
        'lru-cache',
        'shadcn',
        'svgo',
        'tailwindcss',
        'tw-animate-css',
      ],
    },
    'apps/delivery-edge': {
      project: ['src/**/*.ts'],
    },
    'apps/worker': {
      project: ['src/**/*.ts'],
    },
    'apps/transform': {
      project: ['src/**/*.ts'],
    },
    'apps/docs': {
      entry: [
        'src/router.tsx',
        'src/routes/**/*.{ts,tsx}',
        'content/**/*.mdx',
        'source.config.ts',
      ],
      project: ['src/**/*.{ts,tsx}', 'content/**/*.mdx', '*.{ts,tsx}'],
      ignoreDependencies: ['tailwindcss'],
    },
    'packages/*': {
      entry: ['src/index.{ts,tsx}'],
      project: ['src/**/*.{ts,tsx}'],
    },
    'packages/sdk': {
      entry: ['src/index.ts', 'src/signing.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/frameworks/*': {
      entry: ['src/index.{ts,tsx}'],
      project: ['src/**/*.{ts,tsx}'],
    },
    'packages/frameworks/astro': {
      entry: ['src/index.ts', 'src/service.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/frameworks/eleventy': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
  },
  ignoreDependencies: ['vitest'],
  exclude: ['types', 'nsTypes'],
}

export default config
