import {
  siAngular,
  siAstro,
  siHtml5,
  siNextdotjs,
  siNuxt,
  siQwik,
  siReact,
  siRemix,
  siSolid,
  siSvelte,
  siTanstack,
  siVuedotjs,
} from 'simple-icons'

// Official brand marks (simple-icons) for the frameworks Keenpix documents plus
// the "works anywhere that renders <img>" long tail. Rendered monochrome with
// `fill-current` so the dark logos (Next.js, Remix, TanStack) stay legible in
// both light and dark themes — a consistent, professional logo strip.
const FRAMEWORKS = [
  { title: 'React', icon: siReact },
  { title: 'Next.js', icon: siNextdotjs },
  { title: 'Vue', icon: siVuedotjs },
  { title: 'Nuxt', icon: siNuxt },
  { title: 'SvelteKit', icon: siSvelte },
  { title: 'Astro', icon: siAstro },
  { title: 'Remix', icon: siRemix },
  { title: 'TanStack', icon: siTanstack },
  { title: 'Angular', icon: siAngular },
  { title: 'SolidJS', icon: siSolid },
  { title: 'Qwik', icon: siQwik },
  { title: 'HTML', icon: siHtml5 },
]

export function FrameworkLogos() {
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
      {FRAMEWORKS.map((f) => (
        <div
          className="flex flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          key={f.title}
        >
          <svg
            aria-label={f.title}
            className="size-8 fill-current"
            role="img"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d={f.icon.path} />
          </svg>
          <span className="font-medium text-xs">{f.title}</span>
        </div>
      ))}
    </div>
  )
}
