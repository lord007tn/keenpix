import type { AnalyticsEventOutbox } from '@keenpix/database/client'
import { isExternalImageSource } from '@keenpix/transform/activation'

export function selectImageMeasurementCandidates(
  batch: AnalyticsEventOutbox[],
  appOrigin?: string,
) {
  return batch
    .filter(
      (log) =>
        log.activationCandidate && log.status === 200 && log.bytesOut > 0,
    )
    .map((log) => ({
      projectId: log.projectId,
      orgId: log.orgId,
      observedAt: log.ts,
      external: appOrigin
        ? isExternalImageSource(log.sourceHost, appOrigin)
        : false,
    }))
}
