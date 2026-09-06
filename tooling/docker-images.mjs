import { createHash } from 'node:crypto'
import {
  appendFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const lineBreakPattern = /[\r\n]/
const sourceRefPattern = /^refs\/(heads|tags)\/[^\r\n]+$/
const releaseTagPattern =
  /^refs\/tags\/v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const whitespacePattern = /[\s\r\n]/
const gtmIdPattern = /^GTM-[A-Z0-9]+$/
const gaIdPattern = /^G-[A-Z0-9]+$/
const imageVersionPattern = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/
const sourceShaPattern = /^[a-f0-9]{40}$/
const workflowNumberPattern = /^[1-9]\d*$/
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const imageDigestPattern = /^sha256:[a-f0-9]{64}$/
const sha256Pattern = /^[a-f0-9]{64}$/

export function planImages(env) {
  const scope = env.IMAGE_SCOPE || 'all'
  if (!['all', 'app-transform'].includes(scope)) {
    throw new Error('Invalid image scope')
  }
  const ref = env.GITHUB_REF || ''
  if (lineBreakPattern.test(ref) || !sourceRefPattern.test(ref)) {
    throw new Error('Invalid source ref')
  }
  if (ref.startsWith('refs/tags/')) {
    if (scope !== 'all') {
      throw new Error('Scoped builds cannot publish release tags')
    }
    if (!releaseTagPattern.test(ref)) {
      throw new Error('Docker release tags must be semantic versions')
    }
  }
  const publicUrl = env.APP_PUBLIC_URL || ''
  if (publicUrl) {
    const url = new URL(publicUrl)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      whitespacePattern.test(publicUrl)
    ) {
      throw new Error(
        'Public app URL must be HTTP(S) without credentials or whitespace',
      )
    }
  }
  for (const [value, pattern] of [
    [env.APP_GTM_ID || '', gtmIdPattern],
    [env.APP_GA_ID || '', gaIdPattern],
    [env.IMAGE_VERSION || '', imageVersionPattern],
  ]) {
    if (value && (lineBreakPattern.test(value) || !pattern.test(value))) {
      throw new Error('Invalid public build input')
    }
  }
  if (env.IMAGE_VERSION && scope !== 'app-transform') {
    throw new Error(
      'Version override is only supported for app-transform builds',
    )
  }
  const images =
    scope === 'all'
      ? ['app', 'transform', 'worker', 'docs']
      : ['app', 'transform']
  return {
    scope,
    images,
    matrix: {
      include: images.map((image) => ({
        image,
        dockerfile: `apps/${image}/Dockerfile`,
      })),
    },
  }
}

function workflowIdentity(env) {
  if (env.GITHUB_SHA?.length !== 40 || !sourceShaPattern.test(env.GITHUB_SHA)) {
    throw new Error('Invalid source SHA')
  }
  for (const value of [env.GITHUB_RUN_ID, env.GITHUB_RUN_ATTEMPT]) {
    if (
      lineBreakPattern.test(value || '') ||
      !workflowNumberPattern.test(value || '')
    ) {
      throw new Error('Invalid workflow identity')
    }
  }
  if (
    lineBreakPattern.test(env.GITHUB_REPOSITORY || '') ||
    !repositoryPattern.test(env.GITHUB_REPOSITORY || '')
  ) {
    throw new Error('Invalid repository')
  }
  return {
    sourceSha: env.GITHUB_SHA,
    runId: env.GITHUB_RUN_ID,
    runAttempt: env.GITHUB_RUN_ATTEMPT,
  }
}

export function imageReceipt(env) {
  const plan = planImages(env)
  const identity = workflowIdentity(env)
  if (!plan.images.includes(env.IMAGE_NAME)) {
    throw new Error('Image is outside the selected scope')
  }
  if (
    env.IMAGE_DIGEST?.length !== 71 ||
    !imageDigestPattern.test(env.IMAGE_DIGEST)
  ) {
    throw new Error('Missing or invalid published digest')
  }
  const inputs = { version: env.EFFECTIVE_VERSION || '' }
  if (env.IMAGE_NAME === 'app') {
    Object.assign(inputs, {
      publicUrl: env.APP_PUBLIC_URL || '',
      gtmId: env.APP_GTM_ID || '',
      gaId: env.APP_GA_ID || '',
    })
  }
  return {
    schemaVersion: 1,
    ...identity,
    scope: plan.scope,
    image: env.IMAGE_NAME,
    repository: `ghcr.io/${env.GITHUB_REPOSITORY.toLowerCase()}-${env.IMAGE_NAME}`,
    digest: env.IMAGE_DIGEST,
    platform: 'linux/amd64',
    buildInputsSha256: createHash('sha256')
      .update(JSON.stringify(inputs))
      .digest('hex'),
  }
}

export function verifyImageReceipts(receipts, env) {
  const plan = planImages(env)
  const identity = workflowIdentity(env)
  if (receipts.length !== plan.images.length) {
    throw new Error('Incomplete image set')
  }
  const seen = new Set()
  for (const receipt of receipts) {
    if (!plan.images.includes(receipt.image) || seen.has(receipt.image)) {
      throw new Error('Unexpected or duplicate image')
    }
    seen.add(receipt.image)
    if (
      receipt.schemaVersion !== 1 ||
      receipt.scope !== plan.scope ||
      receipt.platform !== 'linux/amd64' ||
      Object.entries(identity).some(([key, value]) => receipt[key] !== value) ||
      receipt.repository !==
        `ghcr.io/${env.GITHUB_REPOSITORY.toLowerCase()}-${receipt.image}` ||
      receipt.digest?.length !== 71 ||
      receipt.buildInputsSha256?.length !== 64 ||
      !imageDigestPattern.test(receipt.digest || '') ||
      !sha256Pattern.test(receipt.buildInputsSha256 || '')
    ) {
      throw new Error('Receipt does not match this workflow attempt and scope')
    }
  }
  return {
    schemaVersion: 1,
    ...identity,
    scope: plan.scope,
    completeImageSet: plan.scope === 'all',
    images: receipts,
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const env = process.env
  const plan = planImages(env)
  const identity = workflowIdentity(env)
  if (process.argv[2] === 'plan') {
    const immutableTag = `type=raw,value=sha-${identity.sourceSha}-run-${identity.runId}-${identity.runAttempt}`
    const tags =
      plan.scope === 'all'
        ? [
            'type=ref,event=branch',
            'type=semver,pattern={{version}},prefix=v',
            'type=semver,pattern={{major}}.{{minor}},prefix=v',
            'type=raw,value=latest,enable={{is_default_branch}}',
            immutableTag,
          ]
        : [immutableTag]
    appendFileSync(
      env.GITHUB_OUTPUT,
      `matrix=${JSON.stringify(plan.matrix)}\nscope=${plan.scope}\ntags<<IMAGE_TAG_RULES\n${tags.join('\n')}\nIMAGE_TAG_RULES\n`,
    )
  } else if (process.argv[2] === 'receipt') {
    mkdirSync('image-receipts', { recursive: true })
    writeFileSync(
      `image-receipts/${env.IMAGE_NAME}.json`,
      `${JSON.stringify(imageReceipt(env), null, 2)}\n`,
    )
  } else if (process.argv[2] === 'verify') {
    const receipts = readdirSync('image-receipts')
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => JSON.parse(readFileSync(`image-receipts/${name}`, 'utf8')))
    writeFileSync(
      'image-manifest.json',
      `${JSON.stringify(verifyImageReceipts(receipts, env), null, 2)}\n`,
    )
  } else {
    throw new Error('Expected plan, receipt or verify')
  }
}
