import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '@/env/server'
import { PrismaClient } from '@/generated/prisma/client'

declare global {
  var __keenpixPrisma: PrismaClient | undefined
}

function createPrisma() {
  if (!env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is required — copy .env.example to .env and set it.',
    )
  }
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

export const prisma = globalThis.__keenpixPrisma ?? createPrisma()

if (env.NODE_ENV !== 'production') {
  globalThis.__keenpixPrisma = prisma
}
