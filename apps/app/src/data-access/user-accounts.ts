import { prisma } from '@keenpix/database'

export async function listUserAuthenticationMethods(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { providerId: true, password: true },
  })
  return {
    hasPassword: accounts.some(
      (account) => account.providerId === 'credential' && account.password,
    ),
    providers: [
      ...new Set(
        accounts
          .filter((account) => account.providerId !== 'credential')
          .map((account) => account.providerId),
      ),
    ],
  }
}
