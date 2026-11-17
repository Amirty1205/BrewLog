import { Outlet } from 'react-router-dom'
import { useLanguage } from '@/app/providers/LanguageContext'
import { AppNavigation } from './AppNavigation'
import { ThemeToggle } from './ThemeToggle'

export function AppShell() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <AppNavigation />
      <div className="min-w-0">
        <header className="flex h-[72px] items-center justify-between border-b border-border/70 px-5 md:px-10">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
            {t('headerJournal')}
          </p>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-[1120px] px-5 pb-28 pt-8 md:px-10 md:pb-12 md:pt-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
