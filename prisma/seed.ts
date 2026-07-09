import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from 'better-auth/crypto'
import { PrismaClient } from '../src/generated/prisma/client.ts'

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

  // The entrypoint re-runs this on every boot, so it must be idempotent-on-create:
  // ensure the super-admin ROLE (safe), but never overwrite a password the
  // operator later changed in-app, nor silently un-ban or re-verify them.
  const admin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: { role: 'super_admin' },
    create: {
      email: SUPER_ADMIN_EMAIL,
      emailVerified: true,
      name: 'Admin',
      role: 'super_admin',
      banned: false,
    },
  })

  const credentialAccount = existingAdmin?.accounts.find(
    (account) => account.providerId === 'credential',
  )

  // Credential already exists → this is a re-run; leave the (possibly changed)
  // password alone. KEENPIX_SUPER_ADMIN_PASSWORD is a one-time bootstrap only.
  if (credentialAccount) {
    return admin
  }

  if (!SUPER_ADMIN_PASSWORD) {
    return admin
  }

  await prisma.account.create({
    data: {
      userId: admin.id,
      accountId: admin.id,
      providerId: 'credential',
      password: await hashPassword(SUPER_ADMIN_PASSWORD),
    },
  })

  return admin
}

async function main() {
  console.log('Seeding Keenpix...')

  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { name: 'Keenpix' },
    create: { id: ORG_ID, name: 'Keenpix', slug: 'default' },
  })

  const admin = await seedSuperAdminUser()

  // The super admin owns the default org (mirrors the migration backfill so a
  // fresh install and an upgraded install converge on the same membership).
  await prisma.member.upsert({
    where: {
      userId_organizationId: { userId: admin.id, organizationId: ORG_ID },
    },
    update: { role: 'owner' },
    create: { organizationId: ORG_ID, userId: admin.id, role: 'owner' },
  })

  await prisma.internalPlanGrant.upsert({
    where: { orgId: ORG_ID },
    update: {
      plan: 'business',
      reason: 'Default operator internal entitlement',
      grantedById: admin.id,
      expiresAt: null,
    },
    create: {
      orgId: ORG_ID,
      plan: 'business',
      reason: 'Default operator internal entitlement',
      grantedById: admin.id,
    },
  })

  console.log(`Seeded default org and super admin user ${SUPER_ADMIN_EMAIL}.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
