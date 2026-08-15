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
    'prisma/schema.prisma',
  ],
  project: [
    'src/**/*.{ts,tsx}',
    'content/**/*.mdx',
    'prisma/**/*.ts',
    '*.{ts,tsx}',
  ],
  ignore: [
    'source.config.ts',
    'src/components/mdx.tsx',
    'src/components/ui/**',
  ],
  ignoreDependencies: ['shadcn', 'tailwindcss', 'tw-animate-css'],
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
