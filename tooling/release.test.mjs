import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { verifyPackedPackage } from './release.mjs'

const missingDistPattern = /no built dist/
const missingDeclaredFilePattern = /declares \.\/dist\/signing\.mjs/
const tarballPublishPattern =
  /'publish',\s+process\.platform === 'win32' \? `"\$\{tarball\}"` : tarball,/
const destinationCwdPattern = /cwd: destination,/
const packageDirectoryCwdPattern = /cwd: (packageEntry\.)?directory/
const expected = { name: '@keenpix/next', version: '0.3.3' }
const internalNames = new Set(['@keenpix/core'])

test('packed manifest guard rejects protocols in every dependency field and incorrect internal versions', () => {
  const directory = mkdtempSync(join(tmpdir(), 'keenpix-pack-test-'))
  try {
    mkdirSync(join(directory, 'package/dist'), { recursive: true })
    writeFileSync(join(directory, 'package/dist/index.mjs'), 'export {}')
    const tarball = join(directory, 'fixture.tgz')
    for (const field of [
      'dependencies',
      'optionalDependencies',
      'peerDependencies',
      'devDependencies',
    ]) {
      for (const range of [
        'workspace:^',
        'catalog:default',
        'link:../core',
        'file:../core',
        'portal:../core',
        '^0.3.2',
      ]) {
        writeFileSync(
          join(directory, 'package/package.json'),
          JSON.stringify({
            ...expected,
            [field]: {
              [range === '^0.3.2' ? '@keenpix/core' : 'external-package']:
                range,
            },
          }),
        )
        execFileSync('tar', ['-czf', tarball, '-C', directory, 'package'])
        assert.throws(() =>
          verifyPackedPackage(tarball, expected, internalNames),
        )
      }
    }
    writeFileSync(
      join(directory, 'package/package.json'),
      JSON.stringify({
        ...expected,
        dependencies: { '@keenpix/core': '^0.3.3' },
      }),
    )
    execFileSync('tar', ['-czf', tarball, '-C', directory, 'package'])
    verifyPackedPackage(tarball, expected, internalNames)
    assert.throws(() =>
      verifyPackedPackage(
        tarball,
        { ...expected, version: '0.3.2' },
        internalNames,
      ),
    )
    rmSync(join(directory, 'package/dist'), { recursive: true })
    execFileSync('tar', ['-czf', tarball, '-C', directory, 'package'])
    assert.throws(
      () => verifyPackedPackage(tarball, expected, internalNames),
      missingDistPattern,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('packed manifest guard rejects a declared entrypoint missing from the tarball', () => {
  const directory = mkdtempSync(join(tmpdir(), 'keenpix-pack-test-'))
  try {
    mkdirSync(join(directory, 'package/dist'), { recursive: true })
    writeFileSync(join(directory, 'package/dist/index.mjs'), 'export {}')
    const tarball = join(directory, 'fixture.tgz')
    const writeManifest = (exports) => {
      writeFileSync(
        join(directory, 'package/package.json'),
        JSON.stringify({ ...expected, main: 'dist/index.mjs', exports }),
      )
      execFileSync('tar', ['-czf', tarball, '-C', directory, 'package'])
    }
    writeManifest({
      '.': { import: './dist/index.mjs' },
      './internal': null,
      './*': './dist/*.mjs',
    })
    verifyPackedPackage(tarball, expected, internalNames)
    writeManifest({
      '.': './dist/index.mjs',
      './signing': { import: './dist/signing.mjs' },
    })
    assert.throws(
      () => verifyPackedPackage(tarball, expected, internalNames),
      missingDeclaredFilePattern,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('publishing sends the verified tarball, never the package directory', () => {
  const source = readFileSync(new URL('./release.mjs', import.meta.url), 'utf8')
  const publishPackages = source.slice(source.indexOf('const publishPackages'))

  assert.match(publishPackages, tarballPublishPattern)
  assert.match(publishPackages, destinationCwdPattern)
  assert.doesNotMatch(publishPackages, packageDirectoryCwdPattern)
})
