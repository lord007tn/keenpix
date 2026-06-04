import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const THEMES = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
]

export function ThemeControl() {
  const { theme, setTheme } = useTheme()
  // next-themes resolves on the client only; gate to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <ToggleGroup
      onValueChange={(v: string[]) => {
        const next = v[0]
        if (next) {
          setTheme(next)
        }
      }}
      size="sm"
      value={mounted ? [theme ?? 'system'] : []}
      variant="outline"
    >
      {THEMES.map((t) => (
        <ToggleGroupItem key={t.value} value={t.value}>
          <t.icon data-icon="inline-start" />
          {t.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
