import { prisma } from '@/db'

const FINANCE_SETTINGS_ID = 'default'

export function getFinanceSettingsRow() {
  return prisma.financeSettings.findUnique({
    where: { id: FINANCE_SETTINGS_ID },
  })
}

export function saveFinanceSettingsRow(input: {
  databaseMonthlyCents: number
  edgeBandwidthMicrodollarsPerGb: number
  edgeRequestsMicrodollarsPerMillion: number
  observabilityMonthlyCents: number
  originBandwidthMicrodollarsPerGb: number
  originRequestsMicrodollarsPerMillion: number
  otherMonthlyCents: number
  serverMonthlyCents: number
}) {
  return prisma.financeSettings.upsert({
    where: { id: FINANCE_SETTINGS_ID },
    create: { id: FINANCE_SETTINGS_ID, ...input },
    update: input,
  })
}
