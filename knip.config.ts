import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'src/router.tsx',
    'src/routes/**/*.{ts,tsx}',
    'src/functions/**/*.ts',
    'src/actions/**/*.ts',
    'src/lib/**/*.ts',
    'prisma/seed.ts',
    'vite.config.ts',
    'vitest.config.ts',
  ],
  project: [
    'src/**/*.{ts,tsx}',
    'content/**/*.mdx',
    'prisma/**/*.ts',
    '*.{ts,tsx}',
  ],
  ignore: [
    'src/routeTree.gen.ts',
    'src/generated/**',
    'prisma/schema.prisma',
    'source.config.ts',
    'src/components/mdx.tsx',
    'src/components/ui/**',
    '.output/**',
    '.source/**',
    '.tanstack/**',
  ],
  ignoreDependencies: [
    '@fontsource-variable/inter',
    'shadcn',
    'tailwindcss',
    'tw-animate-css',
    'web-vitals',
  ],
  ignoreBinaries: ['changelogithub'],
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
