import type { ReactNode } from 'react'
import { SiteFooter, SiteHeader } from '@/features/blog/blog-chrome'
import { RELEASES_URL } from '@/shared/repository'

type ReleaseBlock =
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string }

interface Release {
  blocks: ReleaseBlock[]
  date?: string
  title: string
}

const RELEASE_HEADING = /^\[([^\]]+)\]\s*-\s*(.+)$/

// Minimal, dependency-free parse of the repo CHANGELOG's "Keep a Changelog"
// shape: "## " release sections containing "### " category headings, "- "
// bullets, and the occasional plain paragraph. Anything before the first
// release heading (the file title and intro) is covered by the page hero.
function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = []
  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trimEnd()
    if (line.startsWith('## ')) {
      const heading = line.slice(3).trim()
      const match = heading.match(RELEASE_HEADING)
      releases.push(
        match
          ? { title: match[1], date: match[2], blocks: [] }
          : { title: heading, blocks: [] },
      )
      continue
    }
    const release = releases.at(-1)
    if (!release) {
      continue
    }
    if (line.startsWith('### ')) {
      release.blocks.push({ type: 'heading', text: line.slice(4).trim() })
    } else if (line.startsWith('- ')) {
      const last = release.blocks.at(-1)
      if (last?.type === 'list') {
        last.items.push(line.slice(2).trim())
      } else {
        release.blocks.push({ type: 'list', items: [line.slice(2).trim()] })
      }
    } else if (line.trim() && !line.startsWith('#')) {
      const last = release.blocks.at(-1)
      // Continuation of a wrapped bullet ("  the invitation link…") joins the
      // previous list item instead of becoming a stray paragraph.
      if (rawLine.startsWith('  ') && last?.type === 'list') {
        last.items[last.items.length - 1] += ` ${line.trim()}`
      } else {
        release.blocks.push({ type: 'paragraph', text: line.trim() })
      }
    }
  }
  return releases
}

const INLINE_MARK = /`([^`]*)`|\*\*([^*]+)\*\*/g

// Renders the two inline markdown forms the changelog actually uses: `code`
// spans and **bold** runs. Everything else stays plain text. Keys come from
// each mark's character offset in the line, which is stable and unique.
function renderInline(text: string) {
  const nodes: ReactNode[] = []
  let cursor = 0
  for (const match of text.matchAll(INLINE_MARK)) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index))
    }
    nodes.push(
      match[1] === undefined ? (
        <strong className="font-semibold text-foreground" key={match.index}>
          {match[2]}
        </strong>
      ) : (
        <code
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
          key={match.index}
        >
          {match[1]}
        </code>
      ),
    )
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor))
  }
  return nodes
}

export function ChangelogPage({ markdown }: { markdown: string }) {
  const releases = parseChangelog(markdown)
  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main id="main-content">
        <header className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Changelog
            </span>
            <h1 className="mt-2 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              What's new in Keenpix
            </h1>
            <p className="mt-4 max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed">
              All notable changes, straight from the repository's changelog.
              Tagged builds are also published as{' '}
              <a
                className="text-foreground underline underline-offset-4 hover:text-primary"
                href={RELEASES_URL}
                rel="noreferrer"
                target="_blank"
              >
                GitHub releases
              </a>
              .
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="flex flex-col gap-12">
            {releases.map((release) => (
              <section key={release.title}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-3">
                  <h2 className="font-semibold text-2xl tracking-tight">
                    {release.title}
                  </h2>
                  {release.date ? (
                    <time
                      className="font-mono text-muted-foreground text-sm"
                      dateTime={release.date}
                    >
                      {release.date}
                    </time>
                  ) : null}
                </div>
                {release.blocks.map((block) => {
                  if (block.type === 'heading') {
                    return (
                      <h3
                        className="mt-6 font-semibold text-muted-foreground text-sm uppercase tracking-wider"
                        key={`heading-${block.text}`}
                      >
                        {block.text}
                      </h3>
                    )
                  }
                  if (block.type === 'list') {
                    return (
                      <ul
                        className="mt-3 flex list-disc flex-col gap-2 pl-5 text-muted-foreground leading-relaxed"
                        key={`list-${block.items[0]}`}
                      >
                        {block.items.map((item) => (
                          <li key={item}>{renderInline(item)}</li>
                        ))}
                      </ul>
                    )
                  }
                  return (
                    <p
                      className="mt-4 text-muted-foreground leading-relaxed"
                      key={`paragraph-${block.text}`}
                    >
                      {renderInline(block.text)}
                    </p>
                  )
                })}
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
