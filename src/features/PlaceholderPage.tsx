import { useLanguage, type TranslationKey } from '@/app/providers/LanguageContext'

interface PlaceholderPageProps {
  page: 'coffees' | 'coffeeDetail' | 'journal' | 'explore'
}

const pageCopy: Record<
  PlaceholderPageProps['page'],
  { eyebrow: TranslationKey; title: TranslationKey; description: TranslationKey }
> = {
  coffees: {
    eyebrow: 'coffeesEyebrow',
    title: 'coffeesTitle',
    description: 'coffeesDescription',
  },
  coffeeDetail: {
    eyebrow: 'coffeeDetailEyebrow',
    title: 'coffeeDetailTitle',
    description: 'coffeeDetailDescription',
  },
  journal: {
    eyebrow: 'journalEyebrow',
    title: 'journalTitle',
    description: 'journalDescription',
  },
  explore: {
    eyebrow: 'exploreEyebrow',
    title: 'exploreTitle',
    description: 'exploreDescription',
  },
}

export function PlaceholderPage({ page }: PlaceholderPageProps) {
  const { t } = useLanguage()
  const copy = pageCopy[page]

  return (
    <section className="max-w-2xl" aria-labelledby="page-title">
      <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-primary">
        {t(copy.eyebrow)}
      </p>
      <h1
        id="page-title"
        className="font-display text-4xl tracking-[-0.045em] sm:text-5xl"
      >
        {t(copy.title)}
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
        {t(copy.description)}
      </p>
      <div className="mt-10 rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <p className="font-display text-xl">{t('placeholderTitle')}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('placeholderDescription')}
        </p>
      </div>
    </section>
  )
}
