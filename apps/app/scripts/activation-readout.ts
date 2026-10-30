import { parseArgs } from 'node:util'
import { measurementPrisma, prisma } from '@keenpix/database'
import {
  getFirstImageActivationReadout,
  setOrganizationActivationClassification,
  startFirstExternalImageCoverage,
  verifyFirstExternalImageCoverage,
} from '@keenpix/database/activation'
import { recordFirstExternalImageInterruption } from '@keenpix/database/measurement-outbox'
import dayjs from 'dayjs'
import { z } from 'zod'
import { getFirstValueFunnel } from '../src/actions/admin/first-value'

// Local operator command only. Use restricted DB credentials; never expose this
// cross-tenant read/write capability as a tenant-facing function or public route.
async function main() {
  const { values } = parseArgs({
    options: {
      from: { type: 'string' },
      to: { type: 'string' },
      org: { type: 'string' },
      classification: { type: 'string' },
      apply: { type: 'boolean', default: false },
      daily: { type: 'boolean', default: false },
      'record-measurement-interruption': { type: 'boolean', default: false },
      'verify-external-coverage': { type: 'boolean', default: false },
      'start-external-coverage': { type: 'boolean', default: false },
    },
    strict: true,
  })
  if (values['record-measurement-interruption']) {
    if (
      !values.apply ||
      values.daily ||
      values.org ||
      values.classification ||
      values['verify-external-coverage'] ||
      values['start-external-coverage']
    ) {
      throw new Error('Interruption recording is a separate explicit command.')
    }
    const range = z
      .object({
        from: z.iso.datetime({ offset: true }),
        to: z.iso.datetime({ offset: true }),
      })
      .parse(values)
    const from = dayjs(range.from)
    const to = dayjs(range.to)
    if (!from.isBefore(to)) {
      throw new Error('Interruption requires from < to.')
    }
    await recordFirstExternalImageInterruption({
      from: from.toDate(),
      to: to.toDate(),
    })
    console.log(JSON.stringify({ recorded: true }))
    return
  }
  if (values['verify-external-coverage']) {
    if (
      !values.apply ||
      values.daily ||
      values.org ||
      values.classification ||
      values['start-external-coverage']
    ) {
      throw new Error(
        'Coverage verification is a separate explicit attestation.',
      )
    }
    const range = z
      .object({
        from: z.iso.datetime({ offset: true }),
        to: z.iso.datetime({ offset: true }),
      })
      .parse(values)
    const verified = await verifyFirstExternalImageCoverage({
      from: dayjs(range.from).toDate(),
      to: dayjs(range.to).toDate(),
    })
    if (verified !== 1) {
      throw new Error('Coverage cannot be verified.')
    }
    console.log(JSON.stringify({ verified }))
    return
  }
  if (values['start-external-coverage']) {
    if (
      !values.apply ||
      values.org ||
      values.classification ||
      values.daily ||
      values.from ||
      values.to
    ) {
      throw new Error('Coverage start is a separate, explicit command.')
    }
    console.log(
      JSON.stringify({
        definition: 'origin_first_external_image_v1',
        ...(await startFirstExternalImageCoverage()),
      }),
    )
    return
  }
  if (values.daily) {
    if (values.org || values.classification || values.apply) {
      throw new Error('The daily funnel is a separate, read-only command.')
    }
    const input = z
      .object({
        from: z.iso.datetime({ offset: true }),
        to: z.iso.datetime({ offset: true }),
      })
      .parse(values)
    console.log(JSON.stringify(await getFirstValueFunnel(input), null, 2))
    return
  }
  if (values.org || values.classification || values.apply) {
    const input = z
      .object({
        orgId: z.string().min(1),
        classification: z.enum([
          'customer',
          'internal',
          'test',
          'unclassified',
        ]),
        apply: z.literal(true),
      })
      .parse({
        orgId: values.org,
        classification: values.classification,
        apply: values.apply,
      })
    if (values.from || values.to) {
      throw new Error('Classification and readout must be separate commands.')
    }
    const changed = await setOrganizationActivationClassification(input)
    if (changed !== 1) {
      throw new Error('No organization matched; classification was not saved.')
    }
    console.log(
      JSON.stringify({ classification: input.classification, changed }),
    )
    return
  }
  const input = z
    .object({
      from: z.iso.datetime({ offset: true }),
      to: z.iso.datetime({ offset: true }),
    })
    .parse(values)
  const from = dayjs(input.from)
  const to = dayjs(input.to)
  if (!from.isBefore(to)) {
    throw new Error('The readout requires from < to.')
  }
  const counts = await getFirstImageActivationReadout({
    from: from.toDate(),
    to: to.toDate(),
  })
  console.log(
    JSON.stringify(
      {
        definition: 'origin_first_image_v1',
        generatedAt: dayjs().toISOString(),
        from: from.toISOString(),
        to: to.toISOString(),
        eligibilitySnapshot: 'current_operator_classification_and_membership',
        population: 'retained_projects_only',
        coverage:
          'origin_observations_only; edge-only cache hits are not reconstructed',
        ...counts,
      },
      null,
      2,
    ),
  )
}

main()
  .catch(() => {
    // Driver/validation errors may contain credentials or identifiers. Fail with
    // no invented zero counts and no raw database error in a shareable readout.
    console.error(
      'Activation operation failed. Check arguments, migrations and restricted database access.',
    )
    process.exitCode = 1
  })
  .finally(() =>
    Promise.all([prisma.$disconnect(), measurementPrisma.$disconnect()]),
  )
