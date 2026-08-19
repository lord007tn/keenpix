import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const semanticVersionPattern =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const changelogVersionHeadingPattern = /^## \d+\.\d+\.\d+/m
const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const platformPackagePaths = [
  'apps/app/package.json',
  'apps/custom-domain-edge/package.json',
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
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      ['publish', '--access', 'public', '--no-git-checks', '--provenance'],
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

const getChangelogEntry = ({ directory, manifest }, version) => {
  const changelogPath = join(directory, 'CHANGELOG.md')

  if (!existsSync(changelogPath)) {
    return `- ${manifest.description ?? `Released ${manifest.name}.`}\n- Aligned with the unified Keenpix v${version} line.`
  }

  const changelog = readFileSync(changelogPath, 'utf8')
  const exactHeading = `## ${version}`
  let start = changelog.indexOf(exactHeading)

  if (start < 0) {
    start = changelog.search(changelogVersionHeadingPattern)
  }

  if (start < 0) {
    return `- ${manifest.description ?? `Released ${manifest.name}.`}\n- Aligned with the unified Keenpix v${version} line.`
  }

  const contentStart = changelog.indexOf('\n', start) + 1
  const nextHeading = changelog
    .slice(contentStart)
    .search(changelogVersionHeadingPattern)
  const content = changelog
    .slice(
      contentStart,
      nextHeading < 0 ? undefined : contentStart + nextHeading,
    )
    .trim()
    .replace(/^### /gm, '#### ')

  return (
    content ||
    `- ${manifest.description ?? `Released ${manifest.name}.`}\n- Aligned with the unified Keenpix v${version} line.`
  )
}

const buildReleaseNotes = (version) => {
  const sections = [
    `# Keenpix v${version}`,
    '',
    `The platform, Docker images, SDK, and framework packages share this version and the single \`v${version}\` repository tag.`,
    '',
    '## Platform',
  ]

  for (const packageEntry of platformPackages) {
    sections.push(
      '',
      `### ${packageEntry.manifest.name}`,
      '',
      getChangelogEntry(packageEntry, version),
    )
  }

  sections.push('', '## Public packages')

  for (const packageEntry of getOrderedPublicPackages()) {
    sections.push(
      '',
      `### ${packageEntry.manifest.name}`,
      '',
      getChangelogEntry(packageEntry, version),
    )
  }

  return `${sections.join('\n')}\n`
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
