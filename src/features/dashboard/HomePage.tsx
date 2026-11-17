import { ArrowDownRight, ArrowRight, BookOpenText, Coffee } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/app/providers/LanguageContext'

export function HomePage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-10">
      <section aria-labelledby="welcome-title">
        <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-primary">
          {t('homeEyebrow')}
        </p>
        <h1
          id="welcome-title"
          className="max-w-3xl font-display text-4xl leading-[1.08] tracking-[-0.045em] text-foreground sm:text-5xl md:text-6xl"
        >
          {t('homeHeadline')}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
          {t('homeDescription')}
        </p>
      </section>

      <section
        aria-label={t('homeFeatureTitle')}
        className="relative min-h-[280px] overflow-hidden rounded-2xl bg-[#e8dfd1] p-6 text-[#302920] sm:min-h-[320px] sm:p-10 dark:bg-[#39332b] dark:text-[#eee8dc]"
      >
        <div className="relative z-[1] max-w-lg">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-primary">
            {t('homeFeatureLabel')}
          </p>
          <h2 className="mt-7 max-w-sm font-display text-3xl leading-tight tracking-[-0.035em] sm:text-4xl">
            {t('homeFeatureTitle')}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-current/70">
            {t('homeFeatureDescription')}
          </p>
          <Link
            to="/coffees"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary no-underline hover:underline"
          >
            {t('visitCollection')}
            <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -right-20 size-72 rounded-full border border-[#a85f40]/20 sm:-right-8 sm:size-96 rtl:-left-20 rtl:right-auto sm:rtl:-left-8"
        >
          <div className="absolute inset-8 rounded-full border border-[#a85f40]/25" />
          <div className="absolute inset-16 rounded-full border border-[#a85f40]/30" />
          <div className="absolute inset-24 rounded-full bg-[#a85f40]/10" />
          <ArrowDownRight
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/70 rtl:-scale-x-100"
            size={40}
            strokeWidth={1}
          />
        </div>
      </section>

      <section aria-labelledby="start-here-title">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
              {t('freshPage')}
            </p>
            <h2
              id="start-here-title"
              className="mt-1 font-display text-2xl tracking-[-0.03em]"
            >
              {t('makeItYours')}
            </h2>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/coffees"
            className="group flex min-h-32 items-start justify-between rounded-xl border border-border/70 bg-card p-5 text-card-foreground no-underline transition-colors hover:bg-muted"
          >
            <div>
              <Coffee size={20} className="text-primary" aria-hidden="true" />
              <h3 className="mt-4 font-medium">{t('coffeeShelf')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('coffeeShelfDescription')}
              </p>
            </div>
            <ArrowRight
              size={17}
              className="mt-1 text-muted-foreground rtl:rotate-180"
              aria-hidden="true"
            />
          </Link>
          <Link
            to="/journal"
            className="group flex min-h-32 items-start justify-between rounded-xl border border-border/70 bg-card p-5 text-card-foreground no-underline transition-colors hover:bg-muted"
          >
            <div>
              <BookOpenText
                size={20}
                className="text-primary"
                aria-hidden="true"
              />
              <h3 className="mt-4 font-medium">{t('brewJournal')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('brewJournalDescription')}
              </p>
            </div>
            <ArrowRight
              size={17}
              className="mt-1 text-muted-foreground rtl:rotate-180"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
      <p className="border-t border-border/70 pt-5 text-xs text-muted-foreground">
        {t('homeFooter')}
      </p>
    </div>
  )
}
