import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  compilers: {
    mdx: true,
  },
  entry: [
    'src/router.tsx',
    'src/routes/**/*.{ts,tsx}',
    'src/functions/**/*.ts',
    'src/actions/**/*.ts',
    // Nitro server plugins, registered by path in nitro.config.ts (not imported),
    // so knip can't reach them through the module graph.
    'src/server/nitro/**/*.ts',
    'content/**/*.mdx',
  ],
  project: [
    'src/**/*.{ts,tsx}',
    'content/**/*.mdx',
    'prisma/**/*.ts',
    '*.{ts,tsx}',
  ],
  ignore: [
    'prisma/schema.prisma',
    'source.config.ts',
    'src/components/mdx.tsx',
    'src/components/ui/**',
  ],
  ignoreDependencies: [
    '@fontsource-variable/inter',
    'shadcn',
    'tailwindcss',
    'tw-animate-css',
    'web-vitals',
  ],
  vitest: {
    config: ['vitest.config.ts'],
    entry: ['src/**/*.{test,spec}.ts'],
  },
  prisma: {
    config: ['prisma.config.ts'],
    project: ['prisma/schema.prisma'],
  },
  exclude: ['types', 'nsTypes'],
}

export default config
