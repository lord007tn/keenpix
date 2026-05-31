import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from 'better-auth/crypto'
import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
})

const ORG_ID = 'org_default'
const ADMIN_EMAIL = process.env.KEENPIX_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.KEENPIX_ADMIN_PASSWORD

async function seedAdminUser() {
  if (!ADMIN_EMAIL) {
    throw new Error('Set KEENPIX_ADMIN_EMAIL before seeding the admin user.')
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    include: { accounts: true },
  })

  if (!(ADMIN_PASSWORD || existingAdmin)) {
    throw new Error('Set KEENPIX_ADMIN_PASSWORD before seeding the admin user.')
  }

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      emailVerified: true,
      name: 'Admin',
      role: 'admin',
      banned: false,
      banReason: null,
      banExpires: null,
    },
    create: {
      email: ADMIN_EMAIL,
      emailVerified: true,
      name: 'Admin',
      role: 'admin',
      banned: false,
    },
  })

  if (!ADMIN_PASSWORD) {
    return
  }

  const password = await hashPassword(ADMIN_PASSWORD)
  const credentialAccount = existingAdmin?.accounts.find(
    (account) => account.providerId === 'credential',
  )

  if (credentialAccount) {
    await prisma.account.update({
      where: { id: credentialAccount.id },
      data: { accountId: admin.id, password },
    })
    return
  }

  await prisma.account.create({
    data: {
      userId: admin.id,
      accountId: admin.id,
      providerId: 'credential',
      password,
    },
  })
}

async function main() {
  console.log('Seeding Keenpix...')

  await prisma.org.upsert({
    where: { id: ORG_ID },
    update: { name: 'Keenpix' },
    create: { id: ORG_ID, name: 'Keenpix' },
  })

  await seedAdminUser()

  console.log(`Seeded default org and admin user ${ADMIN_EMAIL}.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
