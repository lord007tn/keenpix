import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from '@/components/theme/theme-provider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const THEMES = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
]

export function ThemeControl() {
  const { theme, setTheme } = useTheme()

  return (
    <ToggleGroup
      onValueChange={(v: string[]) => {
        const next = v[0]
        if (next === 'light' || next === 'dark' || next === 'system') {
          setTheme(next)
        }
      }}
      size="sm"
      value={[theme]}
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
