import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import packageJson from '../../../package.json' with { type: 'json' }
import {
  selfHostingDeployCommand,
  selfHostingReleaseTag,
} from './self-hosting-release'

const releaseReferencePattern = /v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g
const hardCodedReleasePattern = /\bv\d+\.\d+\.\d+\b/
const selfHostingPage = readFileSync(
  new URL('../../../content/self-hosting/index.mdx', import.meta.url),
  'utf8',
)

describe('self-hosting release commands', () => {
  it('derives the release tag from the shipped docs manifest', () => {
    expect(selfHostingReleaseTag).toBe(`v${packageJson.version}`)
  })

  it('pins the clone and every runtime image to the same release', () => {
    const releaseReferences = selfHostingDeployCommand.match(
      releaseReferencePattern,
    )

    expect(releaseReferences).toEqual(
      Array.from({ length: 5 }, () => selfHostingReleaseTag),
    )
    expect(selfHostingDeployCommand).toContain(
      `git clone --branch ${selfHostingReleaseTag} --depth 1`,
    )

    for (const image of ['app', 'transform', 'worker', 'docs']) {
      expect(selfHostingDeployCommand).toContain(
        `ghcr.io/lord007tn/keenpix-${image}:${selfHostingReleaseTag}`,
      )
    }
  })

  it('keeps hard-coded release versions out of the self-hosting page', () => {
    expect(selfHostingPage).toContain('{selfHostingDeployCommand}')
    expect(selfHostingPage).not.toMatch(hardCodedReleasePattern)
  })
})
