'use strict'
// Local stub shipped in place of the real @prisma/studio-core, so that
// purging its radix dependency chain (see pnpm.overrides) doesn't break
// the Prisma CLI's eager top-level requires. Any actual invocation
// (`prisma studio`) will throw — use psql / TablePlus / drizzle-studio.
const handler = {
  get(_t, prop) {
    if (prop === '__esModule') {
      return true
    }
    if (prop === 'default') {
      return new Proxy({}, handler)
    }
    return () => {
      throw new Error(
        '@prisma/studio-core is stubbed (radix purge). `pnpm db:studio` is disabled — use psql or TablePlus.',
      )
    }
  },
}
module.exports = new Proxy({}, handler)
