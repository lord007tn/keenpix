import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

declare global {
  var __keenpixPrisma: PrismaClient | undefined
}

function createPrisma() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required — copy .env.example to .env and set it.',
    )
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  })
}

export const prisma = globalThis.__keenpixPrisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__keenpixPrisma = prisma
}

export * from './generated/prisma/client'
