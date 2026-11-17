import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/app/providers/ThemeContext'
import { useLanguage } from '@/app/providers/LanguageContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const Icon = theme === 'light' ? Moon : Sun

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t(theme === 'light' ? 'switchToDarkTheme' : 'switchToLightTheme')}
      className="grid size-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}
