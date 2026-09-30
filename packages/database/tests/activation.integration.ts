import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, afterEach, test } from 'node:test'
import dayjs from 'dayjs'
import {
  drainAnalyticsOutboxBatch,
  drainProjectAnalyticsOutbox,
  persistAnalyticsOutboxEvent,
} from '../../../apps/app/src/data-access/analytics-outbox'
import {
  getFirstImageActivationReadout,
  recordProjectFirstImageSuccess,
  setOrganizationActivationClassification,
} from '../src/data-access/activation'
import { prisma } from '../src/index'

const target = new URL(process.env.DATABASE_URL ?? 'file:///missing')
assert.equal(
  process.env.KEENPIX_ACTIVATION_TEST_DATABASE,
  'keenpix_activation_test',
)
assert.equal(target.pathname, '/keenpix_activation_test')
assert.ok(['localhost', '127.0.0.1'].includes(target.hostname))
const orgIds: string[] = []
const userIds: string[] = []

afterEach(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } })
  await prisma.analyticsRollupHourly.deleteMany({
    where: { orgId: { in: orgIds } },
  })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  orgIds.length = 0
  userIds.length = 0
})
after(() => prisma.$disconnect())

async function createWorkspace(role = 'user') {
  const orgId = `activation-${randomUUID()}`
  const userId = `activation-${randomUUID()}`
  orgIds.push(orgId)
  userIds.push(userId)
  await prisma.user.create({
    data: { id: userId, email: `${userId}@example.test`, role },
  })
  await prisma.organization.create({
    data: {
      id: orgId,
      name: 'Synthetic activation fixture',
      slug: orgId,
      members: { create: { userId, role: 'owner' } },
    },
  })
  const project = await prisma.project.create({
    data: {
      orgId,
      name: 'Synthetic project',
      origin: 'https://example.test',
      allowedOrigins: ['example.test'],
    },
  })
  return { orgId, projectId: project.id, userId }
}

test('unclassified, test and internal workspaces cannot record activation', async () => {
  const fixture = await createWorkspace()
  assert.equal(await recordProjectFirstImageSuccess(fixture), 0)
  for (const classification of ['test', 'internal', 'unclassified'] as const) {
    assert.equal(
      await setOrganizationActivationClassification({
        ...fixture,
        classification,
      }),
      1,
    )
    assert.equal(await recordProjectFirstImageSuccess(fixture), 0)
  }
  assert.equal(await prisma.projectFirstImageSuccess.count(), 0)
})

test('ordinary ownership is required and every platform operator role is excluded', async () => {
  for (const role of ['admin', 'staff', 'superadmin', 'unknown']) {
    const fixture = await createWorkspace(role)
    await setOrganizationActivationClassification({
      ...fixture,
      classification: 'customer',
    })
    assert.equal(await recordProjectFirstImageSuccess(fixture), 0)
  }
  const fixture = await createWorkspace()
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'customer',
  })
  const operator = await createWorkspace('staff')
  await prisma.member.create({
    data: {
      organizationId: fixture.orgId,
      userId: operator.userId,
      role: 'member',
    },
  })
  assert.equal(await recordProjectFirstImageSuccess(fixture), 0)
  await prisma.member.deleteMany({
    where: { organizationId: fixture.orgId, userId: operator.userId },
  })
  await prisma.member.updateMany({
    where: { organizationId: fixture.orgId },
    data: { role: 'member' },
  })
  assert.equal(await recordProjectFirstImageSuccess(fixture), 0)
})

test('concurrent replicas and retries produce one idempotent observation', async () => {
  const fixture = await createWorkspace()
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'customer',
  })
  const observedAt = dayjs().toDate()
  const results = await Promise.all(
    Array.from({ length: 24 }, () =>
      recordProjectFirstImageSuccess({ ...fixture, observedAt }),
    ),
  )
  assert.equal(
    results.reduce((sum, count) => sum + count, 0),
    1,
  )
  const first = await prisma.projectFirstImageSuccess.findUniqueOrThrow({
    where: { projectId: fixture.projectId },
  })
  assert.equal(await recordProjectFirstImageSuccess(fixture), 0)
  assert.deepEqual(
    await prisma.projectFirstImageSuccess.findUnique({
      where: { projectId: fixture.projectId },
    }),
    first,
  )
  assert.equal(first.definitionVersion, 1)
})

test('the lookup and database constraint both enforce project tenant binding', async () => {
  const fixture = await createWorkspace()
  const other = await createWorkspace()
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'customer',
  })
  assert.equal(
    await recordProjectFirstImageSuccess({
      projectId: fixture.projectId,
      orgId: other.orgId,
    }),
    0,
  )
  await assert.rejects(
    prisma.projectFirstImageSuccess.create({
      data: { projectId: fixture.projectId, orgId: other.orgId },
    }),
  )
  assert.equal(
    await recordProjectFirstImageSuccess({
      projectId: 'missing',
      orgId: fixture.orgId,
    }),
    0,
  )
  await recordProjectFirstImageSuccess(fixture)
  await prisma.project.delete({ where: { id: fixture.projectId } })
  assert.equal(await prisma.projectFirstImageSuccess.count(), 0)
})

test('aggregate readout separates legacy history, prospective observations and unknowns', async () => {
  const fixture = await createWorkspace()
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'customer',
  })
  const from = dayjs().subtract(1, 'day').toDate()
  const to = dayjs().add(1, 'minute').toDate()
  await prisma.organizationActivationPolicy.update({
    where: { orgId: fixture.orgId },
    data: { eligibleSince: from },
  })
  const legacy = await prisma.project.create({
    data: {
      orgId: fixture.orgId,
      name: 'Legacy synthetic project',
      origin: 'https://example.test',
      allowedOrigins: [],
      createdAt: dayjs(from).subtract(1, 'day').toDate(),
    },
  })
  await prisma.project.create({
    data: {
      orgId: fixture.orgId,
      name: 'No observation',
      origin: 'https://example.test',
      allowedOrigins: [],
    },
  })
  await createWorkspace()
  const excluded = await createWorkspace()
  await setOrganizationActivationClassification({
    ...excluded,
    classification: 'test',
  })
  await recordProjectFirstImageSuccess(fixture)
  await recordProjectFirstImageSuccess({
    orgId: fixture.orgId,
    projectId: legacy.id,
  })
  const result = await getFirstImageActivationReadout({ from, to })
  assert.deepEqual(result, {
    retainedProjects: 5,
    unclassifiedProjects: 1,
    excludedProjects: 1,
    classifiedCustomerProjects: 3,
    prospectiveProjects: 2,
    prospectiveProjectsCreatedInWindow: 2,
    prospectiveFirstSuccessesInWindow: 1,
    legacyFirstObservationsInWindow: 1,
    prospectiveProjectsWithoutObservation: 1,
    pendingCandidateEvents: 0,
  })
  assert.ok(!JSON.stringify(result).includes(fixture.orgId))
  const first = await prisma.projectFirstImageSuccess.findUniqueOrThrow({
    where: { projectId: fixture.projectId },
  })
  const boundary = await getFirstImageActivationReadout({
    from,
    to: first.observedAt,
  })
  assert.equal(boundary?.prospectiveFirstSuccessesInWindow, 0)
})

test('outbox processing atomically commits activation and billing, and retries after rollback', async () => {
  const fixture = await createWorkspace()
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'customer',
  })
  const observedAt = dayjs().toDate()
  const event = {
    id: `event-${randomUUID()}`,
    ts: observedAt,
    projectId: fixture.projectId,
    orgId: fixture.orgId,
    path: '/synthetic.jpg',
    format: 'webp',
    status: 200,
    cached: true,
    latencyMs: 1,
    bytesIn: 0,
    bytesOut: 12,
    bytesSaved: 8,
  }
  await persistAnalyticsOutboxEvent(event, true)
  const window = {
    from: dayjs().subtract(1, 'day').toDate(),
    to: dayjs().add(1, 'minute').toDate(),
  }
  assert.equal(
    (await getFirstImageActivationReadout(window))?.pendingCandidateEvents,
    1,
  )
  await assert.rejects(
    prisma.$transaction(async (db) => {
      await drainProjectAnalyticsOutbox(db, fixture.projectId)
      throw new Error('Synthetic rollback')
    }),
  )
  assert.equal(await prisma.projectFirstImageSuccess.count(), 0)
  assert.equal(await prisma.requestLog.count(), 0)
  assert.equal(await prisma.analyticsEventOutbox.count(), 1)
  assert.equal((await drainAnalyticsOutboxBatch(window.to)).status, 'drained')
  assert.equal((await drainAnalyticsOutboxBatch(window.to)).status, 'empty')
  assert.equal(await prisma.analyticsEventOutbox.count(), 0)
  const first = await prisma.projectFirstImageSuccess.findUniqueOrThrow({
    where: { projectId: fixture.projectId },
  })
  assert.deepEqual(first.observedAt, observedAt)
  assert.equal(await prisma.requestLog.count(), 1)
  const rollup = await prisma.analyticsRollupHourly.findFirstOrThrow({
    where: { projectId: fixture.projectId },
  })
  assert.equal(rollup.requests, 1)
  assert.equal(rollup.bytesOut, 12n)
})

test('old outbox rows and observations before enrollment never create reconstructed activation', async () => {
  const fixture = await createWorkspace()
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'customer',
  })
  const base = {
    projectId: fixture.projectId,
    orgId: fixture.orgId,
    path: '/synthetic.jpg',
    format: 'webp',
    status: 200,
    cached: false,
    latencyMs: 1,
    bytesIn: 20,
    bytesOut: 12,
    bytesSaved: 8,
  }
  await persistAnalyticsOutboxEvent({
    ...base,
    id: randomUUID(),
    ts: dayjs().toDate(),
  })
  await persistAnalyticsOutboxEvent(
    { ...base, id: randomUUID(), ts: dayjs().subtract(1, 'day').toDate() },
    true,
  )
  await drainAnalyticsOutboxBatch(dayjs().add(1, 'minute').toDate())
  assert.equal(await prisma.projectFirstImageSuccess.count(), 0)
  assert.equal(await prisma.requestLog.count(), 2)
})

test('a pre-enrollment event in one batch cannot hide a later eligible event', async () => {
  const fixture = await createWorkspace()
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'customer',
  })
  const earlier = dayjs().toDate()
  for (const ts of [
    dayjs().subtract(1, 'day').toDate(),
    dayjs().add(1, 'second').toDate(),
    earlier,
  ]) {
    await persistAnalyticsOutboxEvent(
      {
        id: randomUUID(),
        ts,
        projectId: fixture.projectId,
        orgId: fixture.orgId,
        path: '/synthetic.jpg',
        format: 'webp',
        status: 200,
        cached: true,
        latencyMs: 1,
        bytesIn: 0,
        bytesOut: 12,
        bytesSaved: 8,
      },
      true,
    )
  }
  await drainAnalyticsOutboxBatch(dayjs().add(1, 'minute').toDate())
  assert.equal(await prisma.requestLog.count(), 3)
  assert.equal(await prisma.projectFirstImageSuccess.count(), 1)
  assert.deepEqual(
    (
      await prisma.projectFirstImageSuccess.findUniqueOrThrow({
        where: { projectId: fixture.projectId },
      })
    ).observedAt,
    earlier,
  )
})

test('out-of-order qualified observations converge on the earliest event time', async () => {
  const fixture = await createWorkspace()
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'customer',
  })
  await prisma.organizationActivationPolicy.update({
    where: { orgId: fixture.orgId },
    data: { eligibleSince: dayjs().subtract(1, 'day').toDate() },
  })
  const earlier = dayjs().subtract(1, 'hour').toDate()
  await recordProjectFirstImageSuccess(fixture)
  await recordProjectFirstImageSuccess({ ...fixture, observedAt: earlier })
  await recordProjectFirstImageSuccess(fixture)
  assert.equal(await prisma.projectFirstImageSuccess.count(), 1)
  assert.deepEqual(
    (
      await prisma.projectFirstImageSuccess.findUniqueOrThrow({
        where: { projectId: fixture.projectId },
      })
    ).observedAt,
    earlier,
  )
})

test('classification corrections exclude recorded outcomes and reopening starts fresh coverage', async () => {
  const fixture = await createWorkspace()
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'customer',
  })
  const initial = await prisma.organizationActivationPolicy.findUniqueOrThrow({
    where: { orgId: fixture.orgId },
  })
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'customer',
  })
  assert.deepEqual(
    (
      await prisma.organizationActivationPolicy.findUniqueOrThrow({
        where: { orgId: fixture.orgId },
      })
    ).eligibleSince,
    initial.eligibleSince,
  )
  await recordProjectFirstImageSuccess(fixture)
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'test',
  })
  const result = await getFirstImageActivationReadout({
    from: dayjs().subtract(1, 'day').toDate(),
    to: dayjs().add(1, 'minute').toDate(),
  })
  assert.equal(result?.classifiedCustomerProjects, 0)
  assert.equal(result?.excludedProjects, 1)
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'customer',
  })
  const reopened = await prisma.organizationActivationPolicy.findUniqueOrThrow({
    where: { orgId: fixture.orgId },
  })
  assert.ok(dayjs(reopened.eligibleSince).isAfter(initial.eligibleSince))
  assert.equal(await prisma.projectFirstImageSuccess.count(), 1)
})
