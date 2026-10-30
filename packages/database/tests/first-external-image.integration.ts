import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, afterEach, test } from 'node:test'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { getFirstValueFunnel } from '../../../apps/app/src/actions/admin/first-value'
import {
  drainAnalyticsOutboxBatch,
  persistAnalyticsOutboxEvent,
} from '../../../apps/app/src/data-access/analytics-outbox'
import {
  isActivationDelivery,
  isExternalImageSource,
} from '../../transform/src/activation'
import { createImageMeasurementBuffer } from '../src/actions/image-measurement'
import {
  recordProjectFirstImageSuccesses,
  setOrganizationActivationClassification,
  startFirstExternalImageCoverage,
} from '../src/data-access/activation'
import { measurementPrisma, prisma } from '../src/index'

dayjs.extend(utc)

const target = new URL(process.env.DATABASE_URL ?? 'file:///missing')
assert.equal(
  process.env.KEENPIX_ACTIVATION_TEST_DATABASE,
  'keenpix_activation_test',
)
assert.equal(target.pathname, '/keenpix_activation_test')
assert.ok(['localhost', '127.0.0.1'].includes(target.hostname))

const APP_ORIGIN = 'https://app.example.test'
const orgIds: string[] = []
const userIds: string[] = []

afterEach(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } })
  await prisma.analyticsRollupHourly.deleteMany({
    where: { orgId: { in: orgIds } },
  })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  await prisma.firstExternalImageCoverage.deleteMany()
  await prisma.$executeRaw`DELETE FROM "FirstExternalImageVerifiedInterval"`
  await prisma.$executeRaw`DELETE FROM "FirstExternalImageInterruption"`
  await prisma.$executeRaw`DELETE FROM "ImageMeasurementOutbox"`
  orgIds.length = 0
  userIds.length = 0
})
after(async () => {
  await prisma.$disconnect()
  await measurementPrisma.$disconnect()
})

function utcDate(value: string) {
  return dayjs.utc(value).toDate()
}

async function createUser(role = 'user', createdAt?: Date) {
  const userId = `external-${randomUUID()}`
  userIds.push(userId)
  await prisma.user.create({
    data: { id: userId, email: `${userId}@example.test`, role, createdAt },
  })
  return userId
}

async function createWorkspace(
  options: { role?: string; createdAt?: Date } = {},
) {
  const orgId = `external-${randomUUID()}`
  orgIds.push(orgId)
  const userId = await createUser(options.role, options.createdAt)
  await prisma.organization.create({
    data: {
      id: orgId,
      name: 'Synthetic first value fixture',
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
      createdAt: options.createdAt,
    },
  })
  return { orgId, projectId: project.id, userId }
}

function outboxEvent(
  fixture: { orgId: string; projectId: string },
  overrides: { sourceHost?: string; ts?: Date; status?: number } = {},
) {
  return {
    id: randomUUID(),
    orgId: fixture.orgId,
    projectId: fixture.projectId,
    ts: overrides.ts ?? dayjs().toDate(),
    path: '/synthetic.jpg',
    format: 'webp',
    status: overrides.status ?? 200,
    cached: false,
    latencyMs: 1,
    bytesIn: 20,
    bytesOut: 12,
    bytesSaved: 8,
    sourceHost: overrides.sourceHost ?? 'images.example.test',
  }
}

function getLedgerRow(projectId: string) {
  return prisma.projectFirstExternalImage.findUnique({ where: { projectId } })
}

test('unclassified and customer workspaces qualify without any enrollment', async () => {
  const withoutPolicy = await createWorkspace()
  assert.equal(
    await recordProjectFirstImageSuccesses([
      { ...withoutPolicy, external: true },
    ]),
    0,
    'the returned count stays the v1 ledger',
  )
  assert.ok(await getLedgerRow(withoutPolicy.projectId))
  assert.equal(await prisma.projectFirstImageSuccess.count(), 0)

  for (const classification of ['unclassified', 'customer'] as const) {
    const fixture = await createWorkspace()
    await setOrganizationActivationClassification({
      ...fixture,
      classification,
    })
    await recordProjectFirstImageSuccesses([{ ...fixture, external: true }])
    const row = await getLedgerRow(fixture.projectId)
    assert.equal(row?.orgId, fixture.orgId)
    assert.equal(row?.definitionVersion, 1)
  }
})

test('internal, test and operator-member workspaces are excluded', async () => {
  for (const classification of ['internal', 'test'] as const) {
    const fixture = await createWorkspace()
    await setOrganizationActivationClassification({
      ...fixture,
      classification,
    })
    await recordProjectFirstImageSuccesses([{ ...fixture, external: true }])
    assert.equal(await getLedgerRow(fixture.projectId), null)
  }
  for (const role of ['admin', 'staff', 'superadmin', 'unknown']) {
    const fixture = await createWorkspace({ role })
    await recordProjectFirstImageSuccesses([{ ...fixture, external: true }])
    assert.equal(await getLedgerRow(fixture.projectId), null)
  }
  const mixed = await createWorkspace()
  await prisma.member.create({
    data: {
      organizationId: mixed.orgId,
      userId: await createUser('staff'),
      role: 'member',
    },
  })
  await recordProjectFirstImageSuccesses([{ ...mixed, external: true }])
  assert.equal(await getLedgerRow(mixed.projectId), null)

  const ownerless = await createWorkspace()
  await prisma.member.updateMany({
    where: { organizationId: ownerless.orgId },
    data: { role: 'member' },
  })
  await recordProjectFirstImageSuccesses([{ ...ownerless, external: true }])
  assert.equal(await getLedgerRow(ownerless.projectId), null)
})

test('the external ledger leaves v1 rows and eligibility untouched', async () => {
  const customer = await createWorkspace()
  await setOrganizationActivationClassification({
    ...customer,
    classification: 'customer',
  })
  const earlier = dayjs().add(1, 'minute').toDate()
  assert.equal(
    await recordProjectFirstImageSuccesses([
      { ...customer, external: false, observedAt: earlier },
    ]),
    1,
  )
  assert.equal(await getLedgerRow(customer.projectId), null)
  const v1 = await prisma.projectFirstImageSuccess.findUniqueOrThrow({
    where: { projectId: customer.projectId },
  })
  assert.equal(v1.observedAt.getTime(), earlier.getTime())
  assert.equal(v1.definitionVersion, 1)

  await recordProjectFirstImageSuccesses([
    {
      ...customer,
      external: true,
      observedAt: dayjs(earlier).add(1, 'minute').toDate(),
    },
  ])
  assert.ok(await getLedgerRow(customer.projectId))
  assert.deepEqual(
    await prisma.projectFirstImageSuccess.findUnique({
      where: { projectId: customer.projectId },
    }),
    v1,
  )
})

test('owned source hosts are excluded through the durable drain, including case and subdomains', async () => {
  const hosts = [
    'keenpix.com',
    'www.keenpix.com',
    'cdn.keenpix.com',
    'CDN.KEENPIX.COM',
    'cdn.keenpix.com.',
    'app.example.test',
    'WWW.APP.EXAMPLE.TEST',
  ]
  const fixtures = await Promise.all(hosts.map(() => createWorkspace()))
  const external = await createWorkspace()
  for (const [index, sourceHost] of hosts.entries()) {
    await persistAnalyticsOutboxEvent(
      outboxEvent(fixtures[index], { sourceHost }),
      true,
    )
  }
  await persistAnalyticsOutboxEvent(
    outboxEvent(external, { sourceHost: 'keenpix.com.customer.example.test' }),
    true,
  )
  await drainAnalyticsOutboxBatch(dayjs().add(1, 'minute').toDate(), APP_ORIGIN)

  assert.equal(await prisma.projectFirstExternalImage.count(), 1)
  assert.ok(await getLedgerRow(external.projectId))
  assert.equal(await prisma.analyticsEventOutbox.count(), 0)
})

test('an earlier owned-host event cannot hide a later external one in a batch', async () => {
  const fixture = await createWorkspace()
  const owned = utcDate('2026-01-01T10:00:00Z')
  const external = utcDate('2026-01-01T11:00:00Z')
  await persistAnalyticsOutboxEvent(
    outboxEvent(fixture, { sourceHost: 'cdn.keenpix.com', ts: owned }),
    true,
  )
  await persistAnalyticsOutboxEvent(
    outboxEvent(fixture, { ts: external }),
    true,
  )
  await drainAnalyticsOutboxBatch(dayjs().add(1, 'minute').toDate(), APP_ORIGIN)
  const row = await getLedgerRow(fixture.projectId)
  assert.equal(row?.observedAt.getTime(), external.getTime())
})

test('requests failing any request-time exclusion never reach the ledger', async () => {
  const url = 'https://cdn.example.test/img/image?project=project'
  const excluded = [
    new Request(url, { method: 'HEAD' }),
    new Request(url, { method: 'POST' }),
    new Request(`${url}&__keenpix_preview=1`),
    new Request(url, { headers: { 'x-keenpix-request-purpose': 'prewarm' } }),
    new Request(url, { headers: { purpose: 'prefetch' } }),
    new Request(url, { headers: { 'sec-purpose': 'prerender' } }),
    new Request(url, { headers: { referer: `${APP_ORIGIN}/dashboard` } }),
    new Request(url, { headers: { referer: 'https://www.app.example.test/' } }),
    new Request(url, { headers: { referer: 'not a url' } }),
  ]
  const fixture = await createWorkspace()
  for (const request of excluded) {
    await persistAnalyticsOutboxEvent(
      outboxEvent(fixture),
      isActivationDelivery(request, APP_ORIGIN),
    )
  }
  // A failed or empty response is not a qualifying event even with the bit set.
  await persistAnalyticsOutboxEvent(outboxEvent(fixture, { status: 502 }), true)
  await persistAnalyticsOutboxEvent(
    { ...outboxEvent(fixture), bytesOut: 0 },
    true,
  )
  await drainAnalyticsOutboxBatch(dayjs().add(1, 'minute').toDate(), APP_ORIGIN)
  assert.equal(await prisma.projectFirstExternalImage.count(), 0)
  assert.equal(await prisma.analyticsEventOutbox.count(), 0)

  await persistAnalyticsOutboxEvent(
    outboxEvent(fixture),
    isActivationDelivery(new Request(url), APP_ORIGIN) &&
      isExternalImageSource('images.example.test', APP_ORIGIN),
  )
  await drainAnalyticsOutboxBatch(dayjs().add(1, 'minute').toDate(), APP_ORIGIN)
  assert.equal(await prisma.projectFirstExternalImage.count(), 1)
})

test('concurrent replicas and retries produce one idempotent row', async () => {
  const fixture = await createWorkspace()
  const observedAt = utcDate('2026-02-01T00:00:00Z')
  await Promise.all(
    Array.from({ length: 24 }, () =>
      recordProjectFirstImageSuccesses([
        { ...fixture, external: true, observedAt },
      ]),
    ),
  )
  assert.equal(await prisma.projectFirstExternalImage.count(), 1)
  const first = await getLedgerRow(fixture.projectId)
  await recordProjectFirstImageSuccesses([{ ...fixture, external: true }])
  assert.deepEqual(await getLedgerRow(fixture.projectId), first)
})

// A page of images makes a new project's first writes simultaneous, and the
// background capture retries the v1 uniqueness race without changing any index.
test('simultaneous first deliveries of enrolled customers never fail', async () => {
  for (let round = 0; round < 40; round += 1) {
    const fixture = await createWorkspace()
    await setOrganizationActivationClassification({
      ...fixture,
      classification: 'customer',
    })
    await Promise.all(
      Array.from({ length: 24 }, () =>
        recordProjectFirstImageSuccesses([{ ...fixture, external: true }]),
      ),
    )
    assert.ok(await getLedgerRow(fixture.projectId))
    assert.ok(
      await prisma.projectFirstImageSuccess.findUnique({
        where: { projectId: fixture.projectId },
      }),
    )
  }
})

test('out-of-order events converge on the earliest time, concurrently too', async () => {
  const fixture = await createWorkspace()
  const base = dayjs.utc('2026-03-01T12:00:00Z')
  await recordProjectFirstImageSuccesses([
    { ...fixture, external: true, observedAt: base.toDate() },
  ])
  await Promise.all(
    Array.from({ length: 24 }, (_, index) =>
      recordProjectFirstImageSuccesses([
        {
          ...fixture,
          external: true,
          observedAt: base.subtract(index - 12, 'minute').toDate(),
        },
      ]),
    ),
  )
  const row = await getLedgerRow(fixture.projectId)
  assert.equal(
    row?.observedAt.getTime(),
    base.subtract(11, 'minute').toDate().getTime(),
  )
  await recordProjectFirstImageSuccesses([{ ...fixture, external: true }])
  assert.equal(
    (await getLedgerRow(fixture.projectId))?.observedAt.getTime(),
    row?.observedAt.getTime(),
  )
})

test('the lookup and composite key bind the observation to its tenant', async () => {
  const fixture = await createWorkspace()
  const other = await createWorkspace()
  await recordProjectFirstImageSuccesses([
    { projectId: fixture.projectId, orgId: other.orgId, external: true },
    { projectId: 'missing', orgId: fixture.orgId, external: true },
  ])
  assert.equal(await prisma.projectFirstExternalImage.count(), 0)
  await assert.rejects(
    prisma.projectFirstExternalImage.create({
      data: { projectId: fixture.projectId, orgId: other.orgId },
    }),
  )
  await assert.rejects(
    prisma.$executeRaw`
      INSERT INTO "ProjectFirstExternalImage" ("projectId", "orgId", "definitionVersion")
      VALUES (${fixture.projectId}, ${fixture.orgId}, 2)`,
  )
})

test('deleting a project or organization cascades', async () => {
  const byProject = await createWorkspace()
  const byOrganization = await createWorkspace()
  await recordProjectFirstImageSuccesses([
    { ...byProject, external: true },
    { ...byOrganization, external: true },
  ])
  assert.equal(await prisma.projectFirstExternalImage.count(), 2)
  await prisma.project.delete({ where: { id: byProject.projectId } })
  assert.equal(await getLedgerRow(byProject.projectId), null)
  await prisma.organization.delete({ where: { id: byOrganization.orgId } })
  assert.equal(await prisma.projectFirstExternalImage.count(), 0)
})

test('coverage start is database time, idempotent, and never backdated', async () => {
  const first = await startFirstExternalImageCoverage()
  assert.equal(first?.started, true)
  const second = await startFirstExternalImageCoverage()
  assert.equal(second?.started, false)
  assert.equal(second?.coverageStartedAt, first?.coverageStartedAt)
  assert.ok(
    Math.abs(dayjs().diff(dayjs(first?.coverageStartedAt), 'minute')) < 5,
  )
  assert.equal(await prisma.firstExternalImageCoverage.count(), 1)
})

test('empty days report zero when covered and Unknown when not', async () => {
  const window = {
    from: '2024-06-01T00:00:00Z',
    to: '2024-06-04T00:00:00Z',
  }
  const uncovered = await getFirstValueFunnel(window)
  assert.equal(uncovered.coverageStartedAt, null)
  assert.deepEqual(
    uncovered.days.map((day) => day.day),
    ['2024-06-01', '2024-06-02', '2024-06-03'],
  )
  for (const day of uncovered.days) {
    assert.equal(day.signups, 0)
    assert.equal(day.firstProjectWorkspaces, 0)
    assert.equal(day.firstExternalImageWorkspaces, null)
    assert.equal(day.preexistingFirstExternalImageWorkspaces, null)
  }

  // Starting inside day two leaves it Unknown: the whole day was not observed.
  await prisma.firstExternalImageCoverage.create({
    data: { definitionVersion: 1, startedAt: utcDate('2024-06-02T09:00:00Z') },
  })
  await prisma.$executeRaw`INSERT INTO "FirstExternalImageVerifiedInterval" VALUES ('2024-06-02 09:00:00', '2024-06-04')`
  const covered = await getFirstValueFunnel(window)
  assert.equal(covered.coverageStartedAt, '2024-06-02T09:00:00.000Z')
  assert.deepEqual(
    covered.days.map((day) => day.firstExternalImageWorkspaces),
    [null, null, 0],
  )
  assert.deepEqual(
    covered.days.map((day) => day.preexistingFirstExternalImageWorkspaces),
    [null, null, 0],
  )
})

test('coverage starting exactly at UTC midnight covers that verified day', async () => {
  await prisma.$executeRaw`INSERT INTO "FirstExternalImageVerifiedInterval" VALUES ('2024-06-02', '2024-06-03')`
  await prisma.firstExternalImageCoverage.create({
    data: { definitionVersion: 1, startedAt: utcDate('2024-06-02T00:00:00Z') },
  })
  const { days } = await getFirstValueFunnel({
    from: '2024-06-01T00:00:00Z',
    to: '2024-06-03T00:00:00Z',
  })
  assert.deepEqual(
    days.map((day) => day.firstExternalImageWorkspaces),
    [null, 0],
  )
})

test('milestones land on half-open UTC days and stay separate per workspace', async () => {
  await prisma.$executeRaw`INSERT INTO "FirstExternalImageVerifiedInterval" VALUES ('2024-07-01', '2024-07-04')`
  await prisma.firstExternalImageCoverage.create({
    data: { definitionVersion: 1, startedAt: utcDate('2024-07-01T00:00:00Z') },
  })
  const lastMillisecond = utcDate('2024-07-01T23:59:59.999Z')
  const nextMidnight = utcDate('2024-07-02T00:00:00.000Z')

  const early = await createWorkspace({ createdAt: lastMillisecond })
  const late = await createWorkspace({ createdAt: nextMidnight })
  await prisma.project.create({
    data: {
      orgId: early.orgId,
      name: 'Second project does not repeat the milestone',
      origin: 'https://example.test',
      allowedOrigins: ['example.test'],
      createdAt: utcDate('2024-07-03T00:00:00Z'),
    },
  })
  const earlySecond = await prisma.project.findFirstOrThrow({
    where: { orgId: early.orgId, id: { not: early.projectId } },
  })
  await recordProjectFirstImageSuccesses([
    { ...early, external: true, observedAt: lastMillisecond },
    {
      projectId: earlySecond.id,
      orgId: early.orgId,
      external: true,
      observedAt: utcDate('2024-07-03T12:00:00Z'),
    },
    { ...late, external: true, observedAt: nextMidnight },
  ])

  const { days } = await getFirstValueFunnel({
    from: '2024-07-01T00:00:00Z',
    to: '2024-07-04T00:00:00Z',
  })
  assert.deepEqual(days, [
    {
      day: '2024-07-01',
      signups: 1,
      firstProjectWorkspaces: 1,
      firstExternalImageWorkspaces: 1,
      preexistingFirstExternalImageWorkspaces: 0,
    },
    {
      day: '2024-07-02',
      signups: 1,
      firstProjectWorkspaces: 1,
      firstExternalImageWorkspaces: 1,
      preexistingFirstExternalImageWorkspaces: 0,
    },
    {
      day: '2024-07-03',
      signups: 0,
      firstProjectWorkspaces: 0,
      firstExternalImageWorkspaces: 0,
      preexistingFirstExternalImageWorkspaces: 0,
    },
  ])
})

test('funnel counts exclude ineligible workspaces and operators, and flag pre-coverage projects', async () => {
  await prisma.$executeRaw`INSERT INTO "FirstExternalImageVerifiedInterval" VALUES ('2024-08-01', '2024-08-11')`
  const day = utcDate('2024-08-10T12:00:00Z')
  await prisma.firstExternalImageCoverage.create({
    data: { definitionVersion: 1, startedAt: utcDate('2024-08-01T00:00:00Z') },
  })
  const preexisting = await createWorkspace({
    createdAt: utcDate('2024-05-01T00:00:00Z'),
  })
  const fresh = await createWorkspace({ createdAt: day })
  const classified = await createWorkspace({ createdAt: day })
  const operator = await createWorkspace({ role: 'staff', createdAt: day })
  await recordProjectFirstImageSuccesses(
    [preexisting, fresh, classified, operator].map((fixture) => ({
      ...fixture,
      external: true,
      observedAt: day,
    })),
  )
  // Reclassifying after capture also removes the workspace from the readout.
  await setOrganizationActivationClassification({
    ...classified,
    classification: 'test',
  })

  const funnel = await getFirstValueFunnel({
    from: '2024-08-10T00:00:00Z',
    to: '2024-08-11T00:00:00Z',
  })
  assert.deepEqual(funnel.days, [
    {
      day: '2024-08-10',
      signups: 2,
      firstProjectWorkspaces: 1,
      firstExternalImageWorkspaces: 2,
      preexistingFirstExternalImageWorkspaces: 1,
    },
  ])
  assert.equal(funnel.observedWorkspaces, 2)
  assert.equal(funnel.definition, 'origin_first_external_image_v1')
  assert.equal(funnel.definitionVersion, 1)
  assert.equal(
    funnel.interpretation,
    'daily_milestone_totals_not_a_cohort_conversion_rate',
  )

  const output = JSON.stringify(funnel)
  for (const fixture of [preexisting, fresh, classified, operator]) {
    for (const identifier of Object.values(fixture)) {
      assert.ok(!output.includes(identifier))
    }
  }
  assert.ok(!output.includes('@'))
  assert.ok(!output.includes('example.test'))
})

test('pending candidates are reported before the window end only', async () => {
  const fixture = await createWorkspace()
  await persistAnalyticsOutboxEvent(
    outboxEvent(fixture, { ts: utcDate('2024-09-01T23:59:59.999Z') }),
    true,
  )
  await persistAnalyticsOutboxEvent(
    outboxEvent(fixture, { ts: utcDate('2024-09-02T00:00:00.000Z') }),
    true,
  )
  await persistAnalyticsOutboxEvent(
    outboxEvent(fixture, { ts: utcDate('2024-09-01T00:00:00.000Z') }),
  )
  const { pendingCandidateEvents } = await getFirstValueFunnel({
    from: '2024-09-01T00:00:00Z',
    to: '2024-09-02T00:00:00Z',
  })
  assert.equal(pendingCandidateEvents, 1)
  await prisma.analyticsEventOutbox.deleteMany({
    where: { orgId: fixture.orgId },
  })
})

test('a batch of 500 events writes both ledgers in one drain with unchanged accounting', async (t) => {
  const fixtures = await Promise.all(
    Array.from({ length: 50 }, () => createWorkspace()),
  )
  for (let round = 0; round < 3; round += 1) {
    await prisma.analyticsEventOutbox.createMany({
      data: Array.from({ length: 500 }, (_, index) => ({
        ...outboxEvent(fixtures[index % fixtures.length]),
        activationCandidate: true,
      })),
    })
    const startedAt = performance.now()
    const result = await drainAnalyticsOutboxBatch(
      dayjs().add(1, 'minute').toDate(),
      APP_ORIGIN,
    )
    t.diagnostic(
      `round ${round}: drained 500 events / 50 projects in ${Math.round(performance.now() - startedAt)} ms`,
    )
    assert.equal(result.status, 'drained')
  }
  assert.equal(await prisma.analyticsEventOutbox.count(), 0)
  assert.equal(await prisma.projectFirstExternalImage.count(), 50)
  assert.equal(await prisma.projectFirstImageSuccess.count(), 0)
  assert.equal(
    await prisma.requestLog.count({
      where: { orgId: { in: fixtures.map((fixture) => fixture.orgId) } },
    }),
    1500,
  )
})

test('standalone capture keeps one statement and reports its repeat-delivery cost', async (t) => {
  const fixture = await createWorkspace()
  await setOrganizationActivationClassification({
    ...fixture,
    classification: 'customer',
  })
  // The statement this batch replaced, kept here as the measured baseline.
  const baseline = () => prisma.$executeRaw`
    INSERT INTO "ProjectFirstImageSuccess" ("projectId", "orgId", "observedAt", "definitionVersion")
    SELECT p."id", p."orgId", MIN(COALESCE(event."observedAt", CURRENT_TIMESTAMP)), 1
    FROM jsonb_to_recordset(${JSON.stringify([fixture])}::jsonb)
      AS event("projectId" text, "orgId" text, "observedAt" timestamp)
    JOIN "Project" p ON p."id" = event."projectId" AND p."orgId" = event."orgId"
    JOIN "OrganizationActivationPolicy" policy ON policy."orgId" = p."orgId"
    WHERE policy."classification" = 'customer' AND policy."eligibleSince" IS NOT NULL
      AND policy."eligibleSince" <= COALESCE(event."observedAt", CURRENT_TIMESTAMP)
      AND EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
        WHERE m."organizationId" = p."orgId" AND m."role" = 'owner' AND u."role" = 'user')
      AND NOT EXISTS (SELECT 1 FROM "Member" m JOIN "User" u ON u."id" = m."userId"
        WHERE m."organizationId" = p."orgId" AND u."role" <> 'user')
    GROUP BY p."id", p."orgId"
    ON CONFLICT ("projectId") DO UPDATE SET "observedAt" = EXCLUDED."observedAt"
      WHERE EXCLUDED."observedAt" < "ProjectFirstImageSuccess"."observedAt"
  `
  const extended = () =>
    recordProjectFirstImageSuccesses([{ ...fixture, external: true }])
  await extended()

  // Interleaved pairs cancel machine drift, which dwarfs the statement itself.
  const iterations = 400
  const baselineSamples: number[] = []
  const extendedSamples: number[] = []
  for (let index = 0; index < iterations; index += 1) {
    const runs = [
      { run: baseline, samples: baselineSamples },
      { run: extended, samples: extendedSamples },
    ]
    for (const { run, samples } of index % 2 === 0 ? runs : runs.reverse()) {
      const startedAt = performance.now()
      await run()
      samples.push(performance.now() - startedAt)
    }
  }
  const percentile = (samples: number[], ratio: number) =>
    samples
      .toSorted((a, b) => a - b)
      [Math.floor(iterations * ratio)]?.toFixed(2)
  t.diagnostic(
    `${iterations} interleaved repeat deliveries, p50/p95 ms: ` +
      `baseline ${percentile(baselineSamples, 0.5)}/${percentile(baselineSamples, 0.95)}, ` +
      `both ledgers ${percentile(extendedSamples, 0.5)}/${percentile(extendedSamples, 0.95)}`,
  )
  assert.equal(await prisma.projectFirstExternalImage.count(), 1)
  assert.equal(await prisma.projectFirstImageSuccess.count(), 1)
})

test('missing capture table cannot roll back accounting, and durable retry recovers', async () => {
  const fixture = await createWorkspace()
  await persistAnalyticsOutboxEvent(outboxEvent(fixture), true)
  await prisma.$executeRaw`ALTER TABLE "ProjectFirstExternalImage" RENAME TO "ExternalImageUnavailable"`
  try {
    const result = await drainAnalyticsOutboxBatch(
      dayjs().add(1, 'minute').toDate(),
      APP_ORIGIN,
    )
    assert.equal(result.status, 'drained')
    assert.equal(await prisma.analyticsEventOutbox.count(), 0)
    assert.equal(
      await prisma.requestLog.count({
        where: { projectId: fixture.projectId },
      }),
      1,
    )
    const pending = await prisma.$queryRaw<
      { count: number }[]
    >`SELECT COUNT(*)::int AS count FROM "ImageMeasurementOutbox"`
    assert.equal(pending[0].count, 1)
  } finally {
    await prisma.$executeRaw`ALTER TABLE "ExternalImageUnavailable" RENAME TO "ProjectFirstExternalImage"`
  }
  await drainAnalyticsOutboxBatch(dayjs().add(1, 'minute').toDate(), APP_ORIGIN)
  assert.ok(await getLedgerRow(fixture.projectId))
})

test('missing measurement handoff table cannot abort accounting', async () => {
  const fixture = await createWorkspace()
  await persistAnalyticsOutboxEvent(outboxEvent(fixture), true)
  await prisma.$executeRaw`ALTER TABLE "ImageMeasurementOutbox" RENAME TO "MeasurementUnavailable"`
  try {
    assert.equal(
      (
        await drainAnalyticsOutboxBatch(
          dayjs().add(1, 'minute').toDate(),
          APP_ORIGIN,
        )
      ).status,
      'drained',
    )
    assert.equal(await prisma.analyticsEventOutbox.count(), 0)
    assert.equal(
      await prisma.requestLog.count({
        where: { projectId: fixture.projectId },
      }),
      1,
    )
  } finally {
    await prisma.$executeRaw`ALTER TABLE "MeasurementUnavailable" RENAME TO "ImageMeasurementOutbox"`
  }
})

test('unverified outages and partial-day interruptions are Unknown in both columns', async () => {
  await prisma.firstExternalImageCoverage.create({
    data: { definitionVersion: 1, startedAt: utcDate('2024-01-01') },
  })
  const window = { from: '2024-01-01T00:00:00Z', to: '2024-01-04T00:00:00Z' }
  assert.deepEqual(
    (await getFirstValueFunnel(window)).days.map(
      (d) => d.firstExternalImageWorkspaces,
    ),
    [null, null, null],
  )
  await prisma.$executeRaw`INSERT INTO "FirstExternalImageVerifiedInterval" VALUES ('2024-01-01', '2024-01-03')`
  await prisma.$executeRaw`INSERT INTO "FirstExternalImageInterruption" VALUES ('2024-01-02 12:00', '2024-01-02 12:01')`
  const { days } = await getFirstValueFunnel(window)
  assert.deepEqual(
    days.map((d) => d.firstExternalImageWorkspaces),
    [0, null, null],
  )
  assert.deepEqual(
    days.map((d) => d.preexistingFirstExternalImageWorkspaces),
    [0, null, null],
  )
})

test('measurement lock waits time out on the isolated pool', async () => {
  const fixture = await createWorkspace()
  await prisma.$transaction(async (db) => {
    await db.$executeRaw`LOCK TABLE "ProjectFirstExternalImage" IN ACCESS EXCLUSIVE MODE`
    const start = performance.now()
    await assert.rejects(
      recordProjectFirstImageSuccesses(
        [{ ...fixture, external: true }],
        measurementPrisma,
      ),
    )
    assert.ok(performance.now() - start < 2000)
    assert.equal(
      await db.project.count({ where: { id: fixture.projectId } }),
      1,
    )
  })
})

test('real background capture failure persists an interruption with sanitized logging', {
  timeout: 10_000,
}, async () => {
  const fixture = await createWorkspace()
  const messages: string[] = []
  let report = () => undefined
  const failed = new Promise<void>((resolve) => {
    report = resolve
  })
  const buffer = createImageMeasurementBuffer({
    warn(message) {
      messages.push(message)
      report()
    },
  })
  await prisma.$executeRaw`ALTER TABLE "ProjectFirstExternalImage" RENAME TO "ExternalImageUnavailable"`
  try {
    buffer.enqueue({ ...fixture, external: true })
    await failed
    await buffer.shutdown()
    assert.deepEqual(messages, ['image measurement interrupted'])
    const gaps = await prisma.$queryRaw<
      { count: number }[]
    >`SELECT COUNT(*)::int AS count FROM "FirstExternalImageInterruption"`
    assert.ok(gaps[0].count > 0)
  } finally {
    await prisma.$executeRaw`ALTER TABLE "ExternalImageUnavailable" RENAME TO "ProjectFirstExternalImage"`
  }
})

test('queue overflow and shutdown persist lost coverage without processing queued captures', async () => {
  const fixture = await createWorkspace()
  const buffer = createImageMeasurementBuffer({ warn: () => undefined })
  for (let n = 0; n < 300; n += 1) {
    buffer.enqueue({ ...fixture, external: true })
  }
  await buffer.shutdown()
  assert.equal(await getLedgerRow(fixture.projectId), null)
  const gaps = await prisma.$queryRaw<
    { count: number }[]
  >`SELECT COUNT(*)::int AS count FROM "FirstExternalImageInterruption"`
  assert.ok(gaps[0].count > 0)
})
