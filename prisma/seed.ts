import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from 'better-auth/crypto'
import { PrismaClient } from '../src/generated/prisma/client'

const DATABASE_URL = process.env.DATABASE_URL
const SUPER_ADMIN_EMAIL =
  process.env.KEENPIX_SUPER_ADMIN_EMAIL ?? process.env.KEENPIX_ADMIN_EMAIL
const SUPER_ADMIN_PASSWORD =
  process.env.KEENPIX_SUPER_ADMIN_PASSWORD ?? process.env.KEENPIX_ADMIN_PASSWORD

if (!DATABASE_URL) {
  throw new Error('Set DATABASE_URL before seeding.')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
})

const ORG_ID = 'org_default'

async function seedSuperAdminUser() {
  if (!SUPER_ADMIN_EMAIL) {
    throw new Error(
      'Set KEENPIX_SUPER_ADMIN_EMAIL before seeding the super admin user.',
    )
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN_EMAIL },
    include: { accounts: true },
  })

  if (!(SUPER_ADMIN_PASSWORD || existingAdmin)) {
    throw new Error(
      'Set KEENPIX_SUPER_ADMIN_PASSWORD before seeding the super admin user.',
    )
  }

  const admin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      emailVerified: true,
      name: 'Admin',
      role: 'super_admin',
      banned: false,
      banReason: null,
      banExpires: null,
    },
    create: {
      email: SUPER_ADMIN_EMAIL,
      emailVerified: true,
      name: 'Admin',
      role: 'super_admin',
      banned: false,
    },
  })

  if (!SUPER_ADMIN_PASSWORD) {
    return
  }

  const password = await hashPassword(SUPER_ADMIN_PASSWORD)
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

  await seedSuperAdminUser()

  console.log(`Seeded default org and super admin user ${SUPER_ADMIN_EMAIL}.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
