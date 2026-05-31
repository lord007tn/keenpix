import { prisma } from '@/db'

export interface DatabaseHealth {
  latencyMs: number
  ok: boolean
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const start = performance.now()
  await prisma.$queryRaw`SELECT 1`

  return {
    ok: true,
    latencyMs: Math.round(performance.now() - start),
  }
}
