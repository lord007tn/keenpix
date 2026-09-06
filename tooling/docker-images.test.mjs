import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  imageReceipt,
  planImages,
  verifyImageReceipts,
} from './docker-images.mjs'

const runTagPattern = /sha-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-run-123-2/
const branchTagPattern = /type=ref,event=branch/
const semverTagPattern = /type=semver/
const latestTagPattern = /value=latest/
const releaseAliasPattern = /type=ref|type=semver|value=latest/
const excludedImagePattern = /worker|docs/
const publicInputPattern = /https:\/\/example.com/
const manualTriggerPattern = /on:\s+workflow_dispatch:/
const automaticTriggerPattern =
  /^ {2}(push|pull_request|workflow_run|schedule):/m
const manifestDependenciesPattern = /needs: \[plan, image\]/
const platformPattern = /platforms: linux\/amd64/
const revisionLabelPattern =
  /org.opencontainers.image.revision=\$\{\{ github.sha \}\}/
const publicBuildArgumentPattern =
  /VITE_KEENPIX_PUBLIC_URL=\$\{\{ inputs.app_public_url \}\}/
const digestOutputPattern =
  /IMAGE_DIGEST: \$\{\{ steps.build.outputs.digest \}\}/
const deploymentCommandPattern = /coolify|docker compose up/

const identity = {
  GITHUB_REF: 'refs/heads/example',
  GITHUB_SHA: 'a'.repeat(40),
  GITHUB_RUN_ID: '123',
  GITHUB_RUN_ATTEMPT: '2',
  GITHUB_REPOSITORY: 'example/project',
}
const script = fileURLToPath(new URL('./docker-images.mjs', import.meta.url))

test('default build keeps all four images and empty optional inputs', () => {
  assert.deepEqual(planImages(identity).images, [
    'app',
    'transform',
    'worker',
    'docs',
  ])
  assert.equal(planImages(identity).scope, 'all')
})

test('scoped build selects only the actual app and transform Dockerfiles', () => {
  assert.deepEqual(
    planImages({ ...identity, IMAGE_SCOPE: 'app-transform' }).matrix,
    {
      include: [
        { image: 'app', dockerfile: 'apps/app/Dockerfile' },
        { image: 'transform', dockerfile: 'apps/transform/Dockerfile' },
      ],
    },
  )
})

test('scope cannot be used to publish a partial semver release', () => {
  assert.throws(() =>
    planImages({
      ...identity,
      IMAGE_SCOPE: 'app-transform',
      GITHUB_REF: 'refs/tags/v1.2.3',
    }),
  )
  assert.throws(() =>
    planImages({ ...identity, GITHUB_REF: 'refs/tags/latest' }),
  )
  assert.equal(
    planImages({ ...identity, GITHUB_REF: 'refs/tags/v1.2.3-rc.1' }).scope,
    'all',
  )
  assert.throws(() => planImages({ ...identity, IMAGE_SCOPE: 'unknown' }))
})

test('public inputs accept generic empty defaults and explicit managed values', () => {
  assert.doesNotThrow(() =>
    planImages({
      ...identity,
      IMAGE_SCOPE: 'app-transform',
      APP_PUBLIC_URL: 'https://example.com',
      APP_GTM_ID: 'GTM-EXAMPLE1',
      APP_GA_ID: 'G-EXAMPLE1',
      IMAGE_VERSION: 'reviewed-build',
    }),
  )
  assert.throws(() =>
    planImages({ ...identity, IMAGE_VERSION: 'override-release' }),
  )
  for (const input of [
    { APP_PUBLIC_URL: 'https://user:password@example.com' },
    { APP_PUBLIC_URL: 'file:///etc/passwd' },
    { APP_PUBLIC_URL: 'https://example.com\nOTHER=value' },
    { APP_GTM_ID: 'GTM-EXAMPLE\n' },
    { APP_GA_ID: 'G-EXAMPLE\r\n' },
    { IMAGE_SCOPE: 'app-transform', IMAGE_VERSION: 'version\nOTHER=value' },
  ]) {
    assert.throws(() => planImages({ ...identity, ...input }))
  }
})

test('real plan CLI preserves default aliases but scoped tags cannot update them', () => {
  const directory = mkdtempSync(join(tmpdir(), 'keenpix-image-plan-'))
  try {
    for (const scope of ['all', 'app-transform']) {
      const output = join(directory, `${scope}.txt`)
      writeFileSync(output, '')
      execFileSync(process.execPath, [script, 'plan'], {
        env: {
          ...process.env,
          ...identity,
          IMAGE_SCOPE: scope,
          GITHUB_OUTPUT: output,
          APP_PUBLIC_URL: '',
          APP_GTM_ID: '',
          APP_GA_ID: '',
          IMAGE_VERSION: '',
        },
      })
      const text = readFileSync(output, 'utf8')
      assert.match(text, runTagPattern)
      if (scope === 'all') {
        assert.match(text, branchTagPattern)
        assert.match(text, semverTagPattern)
        assert.match(text, latestTagPattern)
      } else {
        assert.doesNotMatch(text, releaseAliasPattern)
        assert.doesNotMatch(text, excludedImagePattern)
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('receipt binds exact source, workflow attempt, image, platform and build input hash', () => {
  const env = {
    ...identity,
    IMAGE_SCOPE: 'app-transform',
    IMAGE_NAME: 'app',
    IMAGE_DIGEST: `sha256:${'b'.repeat(64)}`,
    EFFECTIVE_VERSION: 'test',
    APP_PUBLIC_URL: 'https://example.com',
  }
  const receipt = imageReceipt(env)
  assert.equal(receipt.sourceSha, identity.GITHUB_SHA)
  assert.equal(receipt.runAttempt, '2')
  assert.equal(receipt.repository, 'ghcr.io/example/project-app')
  assert.equal(receipt.platform, 'linux/amd64')
  assert.notEqual(
    receipt.buildInputsSha256,
    imageReceipt({ ...env, APP_PUBLIC_URL: 'https://different.example.com' })
      .buildInputsSha256,
  )
  assert.doesNotMatch(JSON.stringify(receipt), publicInputPattern)
  assert.throws(() => imageReceipt({ ...env, IMAGE_DIGEST: '' }))
  assert.throws(() =>
    imageReceipt({ ...env, IMAGE_DIGEST: `${env.IMAGE_DIGEST}\n` }),
  )
  assert.equal(
    imageReceipt({ ...env, GITHUB_REPOSITORY: 'Example/Project' }).repository,
    receipt.repository,
  )
  assert.throws(() => imageReceipt({ ...env, IMAGE_NAME: 'worker' }))
})

test('real receipt and aggregate CLI writes a scoped manifest for this attempt only', () => {
  const directory = mkdtempSync(join(tmpdir(), 'keenpix-image-receipts-'))
  const env = {
    ...process.env,
    ...identity,
    IMAGE_SCOPE: 'app-transform',
    APP_PUBLIC_URL: '',
    APP_GTM_ID: '',
    APP_GA_ID: '',
    IMAGE_VERSION: '',
    EFFECTIVE_VERSION: 'example',
  }
  try {
    for (const image of ['app', 'transform']) {
      execFileSync(process.execPath, [script, 'receipt'], {
        cwd: directory,
        env: {
          ...env,
          IMAGE_NAME: image,
          IMAGE_DIGEST: `sha256:${'b'.repeat(64)}`,
        },
      })
    }
    execFileSync(process.execPath, [script, 'verify'], { cwd: directory, env })
    const manifest = JSON.parse(
      readFileSync(join(directory, 'image-manifest.json'), 'utf8'),
    )
    assert.equal(manifest.completeImageSet, false)
    assert.equal(manifest.images.length, 2)
    assert.equal(manifest.runAttempt, '2')
    assert.throws(() =>
      execFileSync(process.execPath, [script, 'verify'], {
        cwd: directory,
        env: { ...env, GITHUB_RUN_ATTEMPT: '3' },
        stdio: 'pipe',
      }),
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('manifest rejects missing, duplicate, stale, cross-scope and substituted receipts', () => {
  const env = { ...identity, IMAGE_SCOPE: 'app-transform' }
  const receipts = ['app', 'transform'].map((image) =>
    imageReceipt({
      ...env,
      IMAGE_NAME: image,
      IMAGE_DIGEST: `sha256:${'b'.repeat(64)}`,
    }),
  )
  const manifest = verifyImageReceipts(receipts, env)
  assert.equal(manifest.completeImageSet, false)
  assert.equal(manifest.scope, 'app-transform')
  assert.throws(() =>
    verifyImageReceipts(receipts, { ...env, IMAGE_SCOPE: 'all' }),
  )
  assert.throws(() => verifyImageReceipts(receipts.slice(0, 1), env))
  assert.throws(() => verifyImageReceipts([receipts[0], receipts[0]], env))
  for (const patch of [
    { runAttempt: '1' },
    { sourceSha: 'c'.repeat(40) },
    { runId: '999' },
    { scope: 'all' },
    { repository: 'ghcr.io/other/app' },
    { digest: 'latest' },
    { platform: 'linux/arm64' },
  ]) {
    assert.throws(() =>
      verifyImageReceipts([{ ...receipts[0], ...patch }, receipts[1]], env),
    )
  }
  const full = planImages(identity).images.map((image) =>
    imageReceipt({
      ...identity,
      IMAGE_NAME: image,
      IMAGE_DIGEST: `sha256:${'b'.repeat(64)}`,
    }),
  )
  assert.equal(verifyImageReceipts(full, identity).completeImageSet, true)
})

test('workflow remains manual and publication manifests require all selected image jobs', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/docker.yml', import.meta.url),
    'utf8',
  )
  assert.match(workflow, manualTriggerPattern)
  assert.doesNotMatch(workflow, automaticTriggerPattern)
  assert.match(workflow, manifestDependenciesPattern)
  assert.match(workflow, platformPattern)
  assert.match(workflow, revisionLabelPattern)
  assert.match(workflow, publicBuildArgumentPattern)
  assert.match(workflow, digestOutputPattern)
  assert.doesNotMatch(workflow, deploymentCommandPattern)
})
