import { useLanguage } from '@/app/providers/LanguageContext'
import { useTheme } from '@/app/providers/ThemeContext'

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()

  return (
    <section className="max-w-2xl" aria-labelledby="settings-title">
      <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-primary">
        {t('preferences')}
      </p>
      <h1
        id="settings-title"
        className="font-display text-4xl tracking-[-0.045em] sm:text-5xl"
      >
        {t('settings')}
      </h1>
      <div className="mt-8 flex items-center justify-between gap-6 border-y border-border/70 py-5">
        <div>
          <h2 className="font-medium">{t('appearance')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('appearanceDescription')}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={t(
            theme === 'light' ? 'switchToDarkTheme' : 'switchToLightTheme',
          )}
          className="shrink-0 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {t(theme === 'light' ? 'lightTheme' : 'darkTheme')}
        </button>
      </div>
      <div className="flex items-center justify-between gap-6 border-b border-border/70 py-5">
        <div>
          <label htmlFor="language" className="font-medium">
            {t('language')}
          </label>
          <p id="language-description" className="mt-1 text-sm text-muted-foreground">
            {t('languageDescription')}
          </p>
        </div>
        <select
          id="language"
          value={language}
          dir={language === 'fa' ? 'rtl' : 'ltr'}
          aria-describedby="language-description"
          onChange={(event) => {
            const selectedLanguage = event.currentTarget.value
            if (selectedLanguage === 'en' || selectedLanguage === 'fa') {
              setLanguage(selectedLanguage)
            }
          }}
          className="min-w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <option value="en">{t('englishLanguage')}</option>
          <option value="fa">{t('persianLanguage')}</option>
        </select>
      </div>
    </section>
  )
}
