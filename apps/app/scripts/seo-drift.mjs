import { createHash } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { isIP } from 'node:net'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

const ALLOWED_HOSTS = new Set(['keenpix.com', 'www.keenpix.com'])

function hash(value) {
  return createHash('sha256').update(value).digest('hex')
}

function isPrivateAddress(address) {
  if (address === '::1' || address === '::') {
    return true
  }
  if (address.startsWith('fc') || address.startsWith('fd')) {
    return true
  }
  if (address.startsWith('fe8') || address.startsWith('fe9')) {
    return true
  }
  if (address.startsWith('fea') || address.startsWith('feb')) {
    return true
  }
  const octets = address.split('.').map(Number)
  if (octets.length !== 4) {
    return false
  }
  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    octets[0] === 0
  )
}

async function validateUrl(value) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('SEO drift only supports HTTP(S) URLs.')
  }
  if (!ALLOWED_HOSTS.has(url.hostname) || isIP(url.hostname)) {
    throw new Error(`SEO drift is restricted to Keenpix hosts: ${url.hostname}`)
  }
  const addresses = await lookup(url.hostname, { all: true })
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error(
      `Refusing a private or reserved address for ${url.hostname}.`,
    )
  }
  return url
}

async function fetchPage(value) {
  let url = await validateUrl(value)
  for (let redirect = 0; redirect <= 5; redirect += 1) {
    const response = await fetch(url, {
      headers: { 'user-agent': 'Keenpix-SEO-Drift/0.2' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        throw new Error(`Redirect ${response.status} has no location.`)
      }
      url = await validateUrl(new URL(location, url).href)
      continue
    }
    return {
      html: await response.text(),
      status: response.status,
      url: url.href,
    }
  }
  throw new Error('SEO drift stopped after more than five redirects.')
}

export function parseSeoSnapshot(html, url, status = 200) {
  const document = new JSDOM(html).window.document
  const schemas = [
    ...document.querySelectorAll('script[type="application/ld+json"]'),
  ].map((script) => JSON.parse(script.textContent || 'null'))
  const openGraph = Object.fromEntries(
    [...document.querySelectorAll('meta[property^="og:"]')]
      .map((meta) => [
        meta.getAttribute('property'),
        meta.getAttribute('content'),
      ])
      .filter(([property]) => property),
  )
  const text = (selector) =>
    [...document.querySelectorAll(selector)].map((element) =>
      element.textContent.trim(),
    )

  return {
    canonical: document.querySelector('link[rel="canonical"]')?.href || null,
    description:
      document.querySelector('meta[name="description"]')?.content || null,
    h1: text('h1'),
    h2: text('h2'),
    h3: text('h3'),
    htmlHash: hash(html),
    openGraph,
    robots: document.querySelector('meta[name="robots"]')?.content || null,
    schema: schemas,
    schemaHash: hash(JSON.stringify(schemas)),
    status,
    title: document.title || null,
    url,
  }
}

export function compareSeoSnapshots(baseline, current) {
  const critical = []
  const warning = []
  const info = []
  if (current.status !== 200) {
    critical.push(`HTTP status changed to ${current.status}.`)
  }
  if (baseline.canonical !== current.canonical) {
    critical.push('Canonical URL changed.')
  }
  if (current.robots?.toLowerCase().includes('noindex')) {
    critical.push('A noindex directive appeared.')
  }
  if (baseline.schemaHash !== current.schemaHash) {
    critical.push('Structured data changed and requires validation.')
  }
  if (baseline.title !== current.title) {
    warning.push('Title changed.')
  }
  if (baseline.description !== current.description) {
    warning.push('Meta description changed.')
  }
  if (JSON.stringify(baseline.h1) !== JSON.stringify(current.h1)) {
    warning.push('H1 structure changed.')
  }
  for (const property of ['og:title', 'og:description', 'og:image', 'og:url']) {
    if (baseline.openGraph[property] && !current.openGraph[property]) {
      warning.push(`${property} was removed.`)
    }
  }
  if (baseline.htmlHash !== current.htmlHash) {
    info.push(
      'Raw HTML changed; review only if parsed SEO fields also changed.',
    )
  }
  return {
    critical,
    info,
    passed: critical.length === 0 && warning.length === 0,
    warning,
  }
}

async function main() {
  const [command, url, file = 'seo-baseline.json'] = process.argv.slice(2)
  if (!(['baseline', 'compare'].includes(command) && url)) {
    throw new Error(
      'Usage: pnpm seo:drift baseline|compare https://keenpix.com [baseline.json]',
    )
  }
  const page = await fetchPage(url)
  const snapshot = parseSeoSnapshot(page.html, page.url, page.status)
  const path = resolve(file)
  if (command === 'baseline') {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
    process.stdout.write(
      `${JSON.stringify({ baseline: path, snapshot }, null, 2)}\n`,
    )
    return
  }
  const baseline = JSON.parse(await readFile(path, 'utf8'))
  const result = compareSeoSnapshots(baseline, snapshot)
  process.stdout.write(
    `${JSON.stringify({ baseline: path, result, snapshot }, null, 2)}\n`,
  )
  if (!result.passed) {
    process.exitCode = 1
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
