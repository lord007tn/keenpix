import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from '@/components/theme/theme-provider'
import { Button } from '@/components/ui/button'

export function ModeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      aria-label="Toggle theme"
      className={className}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      size="icon"
      variant="ghost"
    >
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </Button>
  )
}
