import dayjs from 'dayjs'
import { prisma } from '@/db'

export async function listStaffUsers() {
  const rows = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })
  return rows.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: dayjs(user.createdAt).toISOString(),
  }))
}
