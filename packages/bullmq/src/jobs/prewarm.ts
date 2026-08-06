export const PREWARM_QUEUE_NAME = 'keenpix-prewarm'
export const PREWARM_JOB_NAME = 'transform'

export interface PrewarmTransformJob {
  accept: string
  params: Record<string, string>
  projectId: string
  src: string
}
