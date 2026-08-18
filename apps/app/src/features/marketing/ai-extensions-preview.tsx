import { ScanSearchIcon, SparklesIcon, WandSparklesIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const EXTENSIONS = [
  {
    icon: WandSparklesIcon,
    title: 'Background tools',
    body: 'Remove or replace backgrounds from the same URL-based image workflow.',
  },
  {
    icon: ScanSearchIcon,
    title: 'Subject-aware crops',
    body: 'Keep the important subject in frame across responsive aspect ratios.',
  },
  {
    icon: SparklesIcon,
    title: 'Image intelligence',
    body: 'Generate useful descriptions, tags, and accessibility-ready metadata.',
  },
] as const

export function AiExtensionsPreview() {
  return (
    <section
      className="dark relative overflow-hidden border-border border-y bg-background text-foreground"
      id="ai-extensions"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute top-8 -left-32 size-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 size-72 rounded-full bg-accent/10 blur-3xl" />
      </div>
      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <div className="max-w-xl">
          <Badge
            className="gap-1.5 border-primary/30 bg-primary/10 text-primary hover:bg-primary/10"
            variant="outline"
          >
            <SparklesIcon className="size-3.5" />
            Coming soon
          </Badge>
          <h2 className="mt-5 text-balance font-semibold text-3xl tracking-tight md:text-5xl">
            AI extensions are joining the pipeline.
          </h2>
          <p className="mt-5 max-w-lg text-muted-foreground leading-relaxed">
            Core transforms stay unlimited. AI operations will launch with their
            own transparent usage and price before anyone is charged—no mystery
            credit pool and no effect on team access.
          </p>
          <div className="mt-8 flex items-center gap-3 text-muted-foreground text-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Not included in current plans yet
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {EXTENSIONS.map((extension, index) => (
            <article
              className="group relative min-h-64 overflow-hidden rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur transition-colors hover:border-primary/40 hover:bg-card"
              key={extension.title}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <extension.icon className="size-5" />
                </span>
                <span className="font-mono text-muted-foreground text-xs">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-14 font-semibold text-lg tracking-tight">
                {extension.title}
              </h3>
              <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                {extension.body}
              </p>
              <div className="absolute inset-x-6 bottom-0 h-px bg-primary/0 transition-colors group-hover:bg-primary/50" />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
