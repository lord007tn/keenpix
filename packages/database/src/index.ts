import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

declare global {
  var __keenpixPrisma: PrismaClient | undefined
  var __keenpixMeasurementPrisma: PrismaClient | undefined
}

function createPrisma(measurement = false) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required — copy .env.example to .env and set it.',
    )
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
      ...(measurement
        ? {
            max: 2,
            connectionTimeoutMillis: 500,
            statement_timeout: 750,
            lock_timeout: 150,
            idle_in_transaction_session_timeout: 1000,
            query_timeout: 1000,
            application_name: 'keenpix-measurement',
          }
        : {}),
    }),
  })
}

export const prisma = globalThis.__keenpixPrisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__keenpixPrisma = prisma
}

// Physically separate, capped pool; optional capture cannot consume request connections.
export const measurementPrisma =
  globalThis.__keenpixMeasurementPrisma ?? createPrisma(true)
if (process.env.NODE_ENV !== 'production') {
  globalThis.__keenpixMeasurementPrisma = measurementPrisma
}

export * from './generated/prisma/client'
