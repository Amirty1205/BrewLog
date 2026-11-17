import {
  BookOpenText,
  Coffee,
  Compass,
  House,
  type LucideIcon,
  Settings,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import {
  useLanguage,
  type TranslationKey,
} from '@/app/providers/LanguageContext'

const navigationItems: Array<{
  label: TranslationKey
  path: string
  icon: LucideIcon
}> = [
  { label: 'home', path: '/', icon: House },
  { label: 'coffees', path: '/coffees', icon: Coffee },
  { label: 'journal', path: '/journal', icon: BookOpenText },
  { label: 'explore', path: '/explore', icon: Compass },
  { label: 'settings', path: '/settings', icon: Settings },
]

export function AppNavigation() {
  const { t } = useLanguage()

  return (
    <>
      <aside className="hidden min-h-screen flex-col border-e border-border/70 px-6 py-8 md:flex">
        <NavLink
          to="/"
          className="mb-12 inline-flex items-center gap-3 text-foreground no-underline"
          aria-label={`${t('home')} — Brewlog`}
        >
          <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <Coffee size={20} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <span className="font-display text-[25px] tracking-[-0.04em]">
            brewlog
          </span>
        </NavLink>
        <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">
          {t('yourJournal')}
        </p>
        <nav aria-label={t('navigationLabel')} className="flex flex-col gap-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                {t(item.label)}
              </NavLink>
            )
          })}
        </nav>
        <div className="mt-auto rounded-xl bg-card p-4">
          <p className="font-display text-lg">{t('sidebarTitle')}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t('sidebarDescription')}
          </p>
        </div>
      </aside>

      <nav
        aria-label={t('navigationLabel')}
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-border bg-background/95 px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur md:hidden"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex min-w-0 flex-col items-center gap-1 rounded-lg py-1 text-[10px] ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
              <span className="truncate">{t(item.label)}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
