import { prisma } from '@/db'

// Single-row instance config, mirroring the SmtpSettings pattern. Null columns
// mean "no override" — the running instance keeps its env-derived default.
const DEFAULT_OPS_ID = 'default'

export interface OperationsConfigRow {
  diskCacheMaxMb: number | null
  memoryCacheMaxMb: number | null
}

export async function getOperationsConfigRow(): Promise<OperationsConfigRow> {
  const row = await prisma.operationsSettings.findUnique({
    where: { id: DEFAULT_OPS_ID },
  })
  return {
    diskCacheMaxMb: row?.diskCacheMaxMb ?? null,
    memoryCacheMaxMb: row?.memoryCacheMaxMb ?? null,
  }
}

export async function saveOperationsConfigRow(input: {
  diskCacheMaxMb: number
  memoryCacheMaxMb: number
}) {
  await prisma.operationsSettings.upsert({
    where: { id: DEFAULT_OPS_ID },
    create: { id: DEFAULT_OPS_ID, ...input },
    update: input,
  })
}
