import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const semanticVersionPattern =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const disallowedReleaseNoteReferencePattern = /\bchangelog\b/i
const releaseNotePlaceholderPattern = /\{\{[^}]+\}\}/
const releaseNotePackageHeadingPattern = /^### `(@keenpix\/[a-z0-9-]+)`$/gm
const releaseNoteRequiredSections = [
  '## Highlights',
  '## Platform',
  '## Public packages',
  '## Published components',
  '## Upgrade notes',
  '## Contributors',
]
const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const releaseNotesDirectory = join(repositoryRoot, '.github', 'release-notes')
const platformPackagePaths = [
  'apps/app/package.json',
  'apps/delivery-edge/package.json',
  'apps/docs/package.json',
  'apps/transform/package.json',
  'apps/worker/package.json',
]
const frameworkPackagePaths = readdirSync(
  join(repositoryRoot, 'packages/frameworks'),
)
  .map((directory) => `packages/frameworks/${directory}/package.json`)
  .filter((packagePath) => existsSync(join(repositoryRoot, packagePath)))
const publicPackagePaths = [
  ...frameworkPackagePaths,
  'packages/sdk/package.json',
]

const readPackage = (packagePath) => ({
  packagePath,
  directory: dirname(join(repositoryRoot, packagePath)),
  manifest: JSON.parse(readFileSync(join(repositoryRoot, packagePath), 'utf8')),
})

const platformPackages = platformPackagePaths.map(readPackage)
const publicPackages = publicPackagePaths.map(readPackage)
const releasePackages = [...platformPackages, ...publicPackages]

const getVersion = () => {
  const value = process.argv[3] ?? process.env.GITHUB_REF_NAME
  const version = value?.startsWith('v') ? value.slice(1) : value

  if (!(version && semanticVersionPattern.test(version))) {
    throw new Error('Pass a semantic version such as v0.3.1.')
  }

  return version
}

const verifyVersions = (version) => {
  const mismatches = releasePackages.filter(
    ({ manifest }) => manifest.version !== version,
  )

  if (mismatches.length > 0) {
    for (const { manifest } of mismatches) {
      console.error(
        `${manifest.name} is ${manifest.version}; expected ${version}`,
      )
    }
    throw new Error('Release package versions do not match the repository tag.')
  }

  console.log(
    `Verified ${releasePackages.length} release components at ${version}.`,
  )
}

const getOrderedPublicPackages = () => {
  const packagesByName = new Map(
    publicPackages.map((packageEntry) => [
      packageEntry.manifest.name,
      packageEntry,
    ]),
  )
  const orderedPackages = []
  const visited = new Set()

  const visit = (packageEntry) => {
    if (visited.has(packageEntry.manifest.name)) {
      return
    }

    visited.add(packageEntry.manifest.name)
    const dependencies = {
      ...packageEntry.manifest.dependencies,
      ...packageEntry.manifest.optionalDependencies,
      ...packageEntry.manifest.peerDependencies,
    }

    for (const dependencyName of Object.keys(dependencies)) {
      const dependency = packagesByName.get(dependencyName)
      if (dependency) {
        visit(dependency)
      }
    }

    orderedPackages.push(packageEntry)
  }

  for (const packageEntry of publicPackages) {
    visit(packageEntry)
  }

  return orderedPackages
}

const publishPackages = async (version) => {
  verifyVersions(version)
  const dryRun = process.env.RELEASE_DRY_RUN === 'true'

  for (const packageEntry of getOrderedPublicPackages()) {
    const { name } = packageEntry.manifest
    const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`
    const response = await fetch(registryUrl)

    if (response.ok) {
      console.log(`Skipping ${name}@${version}; it is already published.`)
      continue
    }

    if (response.status !== 404) {
      throw new Error(
        `Could not check ${name}@${version}: npm returned ${response.status}.`,
      )
    }

    if (dryRun) {
      console.log(`Would publish ${name}@${version}.`)
      continue
    }

    console.log(`Publishing ${name}@${version}.`)
    const result = spawnSync(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['publish', '--access', 'public'],
      {
        cwd: packageEntry.directory,
        env: process.env,
        stdio: 'inherit',
      },
    )

    if (result.status !== 0) {
      throw new Error(
        `Publishing ${name}@${version} failed with exit code ${result.status}.`,
      )
    }
  }
}

const buildReleaseNotes = (version) => {
  const tag = `v${version}`
  const releaseNotesPath = join(releaseNotesDirectory, `${tag}.md`)

  if (!existsSync(releaseNotesPath)) {
    throw new Error(
      `Create .github/release-notes/${tag}.md before publishing ${tag}.`,
    )
  }

  const source = readFileSync(releaseNotesPath, 'utf8')

  if (!source.startsWith(`# Keenpix ${tag}\n`)) {
    throw new Error(`Release notes must start with "# Keenpix ${tag}".`)
  }

  for (const heading of releaseNoteRequiredSections) {
    if (!source.includes(`\n${heading}\n`)) {
      throw new Error(`Release notes are missing the "${heading}" section.`)
    }
  }

  if (disallowedReleaseNoteReferencePattern.test(source)) {
    throw new Error('Release notes must be self-contained.')
  }

  const documentedPackages = [
    ...source.matchAll(releaseNotePackageHeadingPattern),
  ].map((match) => match[1])
  const releasePackageNames = releasePackages.map(
    ({ manifest }) => manifest.name,
  )
  const unknownPackages = documentedPackages.filter(
    (name) => !releasePackageNames.includes(name),
  )
  const duplicatePackages = documentedPackages.filter(
    (name, index) => documentedPackages.indexOf(name) !== index,
  )

  if (documentedPackages.length === 0) {
    throw new Error(
      'Release notes must document at least one changed component.',
    )
  }

  if (unknownPackages.length > 0) {
    throw new Error(
      `Release notes contain unknown components: ${unknownPackages.join(', ')}.`,
    )
  }

  if (duplicatePackages.length > 0) {
    throw new Error(
      `Release notes repeat component sections for: ${[...new Set(duplicatePackages)].join(', ')}.`,
    )
  }

  const tagResult = spawnSync(
    'git',
    ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
    },
  )
  const previousTagResult = spawnSync(
    'git',
    [
      'describe',
      '--tags',
      '--match',
      'v[0-9]*',
      '--abbrev=0',
      tagResult.status === 0 ? `${tag}^` : 'HEAD',
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
    },
  )

  if (previousTagResult.status !== 0) {
    throw new Error(`Could not determine the repository tag before ${tag}.`)
  }

  const previousTag = previousTagResult.stdout.trim()
  const repository = process.env.GITHUB_REPOSITORY ?? 'lord007tn/keenpix'
  const versionMatrix = [
    '| Component | Kind | Version |',
    '| --- | --- | --- |',
    ...platformPackages.map(
      ({ manifest }) => `| \`${manifest.name}\` | Platform | \`${version}\` |`,
    ),
    ...getOrderedPublicPackages().map(
      ({ manifest }) =>
        `| \`${manifest.name}\` | Public package | \`${version}\` |`,
    ),
  ].join('\n')
  const replacements = {
    '{{compare_url}}': `https://github.com/${repository}/compare/${previousTag}...${tag}`,
    '{{previous_tag}}': previousTag,
    '{{tag}}': tag,
    '{{version}}': version,
    '{{version_matrix}}': versionMatrix,
  }
  let notes = source

  for (const [placeholder, value] of Object.entries(replacements)) {
    notes = notes.replaceAll(placeholder, value)
  }

  if (releaseNotePlaceholderPattern.test(notes)) {
    throw new Error('Release notes contain an unsupported placeholder.')
  }

  return `${notes.trim()}\n`
}

const command = process.argv[2]
const version = getVersion()

if (command === 'verify') {
  verifyVersions(version)
} else if (command === 'publish') {
  await publishPackages(version)
} else if (command === 'notes') {
  process.stdout.write(buildReleaseNotes(version))
} else {
  throw new Error('Use release.mjs with verify, publish, or notes.')
}
