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
      className="border-b bg-foreground text-background"
      id="ai-extensions"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <Badge className="border-background/20 bg-background/10 text-background hover:bg-background/10">
            Coming soon
          </Badge>
          <h2 className="mt-4 text-balance font-semibold text-3xl tracking-tight md:text-4xl">
            AI extensions are joining the pipeline.
          </h2>
          <p className="mt-4 max-w-xl text-background/65 leading-relaxed">
            Core transforms stay unlimited. AI operations will launch with their
            own transparent usage and price before anyone is charged—no mystery
            credit pool and no effect on team access.
          </p>
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-background/10 bg-background/10 sm:grid-cols-3">
          {EXTENSIONS.map((extension) => (
            <div className="bg-foreground p-6" key={extension.title}>
              <extension.icon className="size-5 text-primary" />
              <h3 className="mt-8 font-semibold">{extension.title}</h3>
              <p className="mt-2 text-background/60 text-sm leading-relaxed">
                {extension.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
