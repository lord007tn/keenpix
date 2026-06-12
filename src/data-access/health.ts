import { prisma } from '@/db'

export async function checkDatabaseHealth() {
  const start = performance.now()
  await prisma.$queryRaw`SELECT 1`

  return {
    ok: true,
    latencyMs: Math.round(performance.now() - start),
  }
}
