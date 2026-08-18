import { readFile } from 'node:fs/promises'
import os from 'node:os'
import dayjs from 'dayjs'

// Server-only. Reads the running container's CPU and memory state from the
// Linux cgroup pseudo-files, falling back to Node's `process`/`os` views when
// those are absent (dev on Windows/macOS, or an unconstrained container). Every
// file read is best-effort so a missing path never throws — it just degrades to
// the host/process numbers.

// ~15 min of history at one sample / 10s — enough for the live sparkline.
const MAX_SAMPLES = 90
// First reading has no prior baseline, so we sample CPU twice this far apart to
// produce a real percentage instead of a cold 0%.
const BOOTSTRAP_MS = 120

// Hoisted so the hot sampler path doesn't recompile them on every read.
const CPU_USAGE_USEC_RE = /usage_usec\s+(\d+)/
const WHITESPACE_RE = /\s+/

async function readText(path: string) {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

async function readNum(path: string) {
  const text = await readText(path)
  if (text == null) {
    return null
  }
  const n = Number(text.trim())
  return Number.isFinite(n) ? n : null
}

// Cumulative CPU time consumed, in microseconds. cgroup v2 reports this in
// cpu.stat; v1 in cpuacct.usage (nanoseconds). With neither we fall back to this
// process's own CPU time, which still produces a usable delta.
async function readCpuUsageUsec() {
  const v2 = await readText('/sys/fs/cgroup/cpu.stat')
  if (v2) {
    const match = v2.match(CPU_USAGE_USEC_RE)
    if (match) {
      return Number(match[1])
    }
  }
  const v1 = await readNum('/sys/fs/cgroup/cpuacct/cpuacct.usage')
  if (v1 != null) {
    return Math.round(v1 / 1000)
  }
  const cpu = process.cpuUsage()
  return cpu.user + cpu.system
}

// Effective core budget for the container. A cgroup CPU quota (v2 cpu.max or v1
// cfs_quota/period) caps how much CPU the container may use; without one we use
// the host core count so the percentage reads against the whole machine.
async function readCpuCores() {
  const v2 = await readText('/sys/fs/cgroup/cpu.max')
  if (v2) {
    const [quota, period] = v2.trim().split(WHITESPACE_RE)
    if (quota && quota !== 'max') {
      const q = Number(quota)
      const p = Number(period)
      if (q > 0 && p > 0) {
        return { cores: q / p, capped: true }
      }
    }
  }
  const quotaV1 = await readNum('/sys/fs/cgroup/cpu/cpu.cfs_quota_us')
  const periodV1 = await readNum('/sys/fs/cgroup/cpu/cpu.cfs_period_us')
  if (quotaV1 != null && quotaV1 > 0 && periodV1 != null && periodV1 > 0) {
    return { cores: quotaV1 / periodV1, capped: true }
  }
  const hostCores = (os.availableParallelism?.() ?? os.cpus().length) || 1
  return { cores: hostCores, capped: false }
}

// Container memory usage + limit. cgroup current includes the page cache, which
// is exactly what counts toward an OOM kill, so it's the right "used" number for
// pressure. v1 reports "unlimited" as a huge sentinel near 2^63, so anything at
// or above host total is treated as uncapped.
async function readMemory() {
  const currentV2 = await readNum('/sys/fs/cgroup/memory.current')
  const maxV2 = await readText('/sys/fs/cgroup/memory.max')
  if (currentV2 != null && maxV2 != null) {
    const trimmed = maxV2.trim()
    const limit = trimmed === 'max' ? null : Number(trimmed)
    return { used: currentV2, limit: limit && limit > 0 ? limit : null }
  }
  const currentV1 = await readNum('/sys/fs/cgroup/memory/memory.usage_in_bytes')
  const maxV1 = await readNum('/sys/fs/cgroup/memory/memory.limit_in_bytes')
  if (currentV1 != null && maxV1 != null) {
    return { used: currentV1, limit: maxV1 >= os.totalmem() ? null : maxV1 }
  }
  return { used: process.memoryUsage().rss, limit: null }
}

function cpuPercentFrom(deltaUsec: number, deltaWallMs: number, cores: number) {
  if (deltaWallMs <= 0 || cores <= 0) {
    return 0
  }
  const pct = (deltaUsec / (deltaWallMs * 1000 * cores)) * 100
  return Math.max(0, Math.min(100, pct))
}

export async function readResourceSnapshot() {
  const [{ cores, capped }, mem] = await Promise.all([
    readCpuCores(),
    readMemory(),
  ])

  const usage = await readCpuUsageUsec()
  let atMs = Date.now()
  let percent: number
  if (state.lastCpuSample) {
    percent = cpuPercentFrom(
      usage - state.lastCpuSample.usageUsec,
      atMs - state.lastCpuSample.atMs,
      cores,
    )
    state.lastCpuSample = { usageUsec: usage, atMs }
  } else {
    await new Promise((resolve) => setTimeout(resolve, BOOTSTRAP_MS))
    const usage2 = await readCpuUsageUsec()
    const atMs2 = Date.now()
    percent = cpuPercentFrom(usage2 - usage, atMs2 - atMs, cores)
    state.lastCpuSample = { usageUsec: usage2, atMs: atMs2 }
    atMs = atMs2
  }

  const mu = process.memoryUsage()
  const limitBytes = mem.limit ?? os.totalmem()
  // cgroup-derived when we have either a memory cap or a CPU quota; otherwise the
  // numbers are host-wide and the UI labels the limit as "host total".
  const source = mem.limit != null || capped ? 'cgroup' : 'host'
  return {
    atMs,
    source,
    cpu: { percent, cores, loadAvg: os.loadavg() },
    memory: {
      usedBytes: mem.used,
      limitBytes,
      limitIsCap: mem.limit != null,
      percent:
        limitBytes > 0 ? Math.min(100, (mem.used / limitBytes) * 100) : 0,
      rss: mu.rss,
      heapUsed: mu.heapUsed,
      heapTotal: mu.heapTotal,
      external: mu.external,
    },
  }
}

type ResourceSnapshot = Awaited<ReturnType<typeof readResourceSnapshot>>

// One persisted row per hour — avg + peak, never the raw per-sample stream — so
// the table stays at ~24 rows/day. This is the shape `recordSample` hands back
// to the sampler at each hour boundary for `upsertResourceRollup`.
export interface ResourceRollup {
  bucketStart: Date
  cpuAvgPct: number
  cpuCores: number
  cpuPeakPct: number
  memAvgBytes: number
  memLimitBytes: number
  memPeakBytes: number
  samples: number
}

interface HourAccumulator {
  coresLast: number
  cpuPeak: number
  cpuSum: number
  memLimitLast: number
  memPeak: number
  memSum: number
  samples: number
  startMs: number
}

interface ResourceState {
  hour: HourAccumulator | null
  lastCpuSample: { usageUsec: number; atMs: number } | null
  peakCpuAtMs: number | null
  peakCpuPercent: number
  peakMemAtMs: number | null
  peakMemBytes: number
  ring: ResourceSnapshot[]
}

// In-process runtime state, parked on globalThis like the Prisma client. The
// background sampler interval and the request-time readers must mutate and read
// the SAME object — a dev re-import or HMR can otherwise hand them separate
// module instances, leaving the sampler filling one ring while the page reads
// another empty one.
declare global {
  var __keenpixResourceState: ResourceState | undefined
}

function createResourceState(): ResourceState {
  return {
    hour: null,
    lastCpuSample: null,
    peakCpuAtMs: null,
    peakCpuPercent: 0,
    peakMemAtMs: null,
    peakMemBytes: 0,
    ring: [],
  }
}

const state = globalThis.__keenpixResourceState ?? createResourceState()
globalThis.__keenpixResourceState = state

// Fold one snapshot into the live window, peaks, and hourly accumulator. Returns
// the just-completed hour rollup when the clock crosses into a new hour, else
// null. The sampler persists whatever it returns.
export function recordSample(
  snapshot: ResourceSnapshot,
): ResourceRollup | null {
  state.ring.push(snapshot)
  if (state.ring.length > MAX_SAMPLES) {
    state.ring.shift()
  }
  if (snapshot.cpu.percent >= state.peakCpuPercent) {
    state.peakCpuPercent = snapshot.cpu.percent
    state.peakCpuAtMs = snapshot.atMs
  }
  if (snapshot.memory.usedBytes >= state.peakMemBytes) {
    state.peakMemBytes = snapshot.memory.usedBytes
    state.peakMemAtMs = snapshot.atMs
  }

  const hourStart = dayjs(snapshot.atMs).startOf('hour').valueOf()
  let completed: ResourceRollup | null = null
  if (state.hour && state.hour.startMs !== hourStart) {
    completed = {
      bucketStart: new Date(state.hour.startMs),
      cpuAvgPct: state.hour.cpuSum / state.hour.samples,
      cpuPeakPct: state.hour.cpuPeak,
      cpuCores: state.hour.coresLast,
      memAvgBytes: state.hour.memSum / state.hour.samples,
      memPeakBytes: state.hour.memPeak,
      memLimitBytes: state.hour.memLimitLast,
      samples: state.hour.samples,
    }
    state.hour = null
  }
  if (!state.hour) {
    state.hour = {
      startMs: hourStart,
      cpuSum: 0,
      cpuPeak: 0,
      memSum: 0,
      memPeak: 0,
      memLimitLast: snapshot.memory.limitBytes,
      coresLast: snapshot.cpu.cores,
      samples: 0,
    }
  }
  state.hour.cpuSum += snapshot.cpu.percent
  state.hour.cpuPeak = Math.max(state.hour.cpuPeak, snapshot.cpu.percent)
  state.hour.memSum += snapshot.memory.usedBytes
  state.hour.memPeak = Math.max(state.hour.memPeak, snapshot.memory.usedBytes)
  state.hour.memLimitLast = snapshot.memory.limitBytes
  state.hour.coresLast = snapshot.cpu.cores
  state.hour.samples += 1
  return completed
}

export async function getResourceLiveStats() {
  let current = state.ring.at(-1)
  if (!current) {
    // Fresh boot before the sampler's first tick landed — seed one sample so the
    // page renders real numbers instead of a blank panel.
    current = await readResourceSnapshot()
    recordSample(current)
  }
  return {
    source: current.source,
    cpu: current.cpu,
    memory: current.memory,
    peaks: {
      cpuPercent: state.peakCpuPercent,
      cpuAt: state.peakCpuAtMs
        ? new Date(state.peakCpuAtMs).toISOString()
        : null,
      memBytes: state.peakMemBytes,
      memAt: state.peakMemAtMs
        ? new Date(state.peakMemAtMs).toISOString()
        : null,
    },
    series: state.ring.map((s) => ({
      t: s.atMs,
      cpu: Math.round(s.cpu.percent),
      mem: s.memory.usedBytes,
    })),
    sampleCount: state.ring.length,
  }
}
