import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  compilers: {
    mdx: true,
  },
  workspaces: {
    'apps/app': {
      entry: [
        'src/router.tsx',
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
        'shadcn',
        'tailwindcss',
        'tw-animate-css',
      ],
    },
    'apps/custom-domain-edge': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
    'apps/docs': {
      entry: ['source.config.ts'],
      project: ['source.config.ts'],
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
  },
  ignoreDependencies: ['vitest'],
  exclude: ['types', 'nsTypes'],
}

export default config
