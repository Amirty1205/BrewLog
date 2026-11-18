import { Check, Coffee, MapPin, RotateCcw } from 'lucide-react'
import type { Coffee as CoffeeRecord } from '@/domain/coffee-records'
import type { MyCoffeeCollectionItem } from './collection-types'
import { useLanguage, type TranslationKey } from '@/app/providers/LanguageContext'

interface CoffeeCollectionCardProps {
  item: MyCoffeeCollectionItem
  busy: boolean
  onToggleStatus: (item: MyCoffeeCollectionItem) => void
}

function roastLevelKey(
  level: CoffeeRecord['roastLevel'],
): TranslationKey | undefined {
  switch (level) {
    case 'light':
      return 'roastLevelLight'
    case 'medium':
      return 'roastLevelMedium'
    case 'dark':
      return 'roastLevelDark'
    case 'unknown':
      return 'roastLevelUnknown'
    default:
      return undefined
  }
}

export function CoffeeCollectionCard({
  item,
  busy,
  onToggleStatus,
}: CoffeeCollectionCardProps) {
  const { t } = useLanguage()
  const { coffee, myCoffee } = item
  const finished = myCoffee.status === 'finished'
  const origin = [
    coffee.originFarm?.name,
    coffee.originRegion?.name,
    coffee.originCountry?.name,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ')
  const roastKey = roastLevelKey(coffee.roastLevel)

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-card text-card-foreground ${
        finished ? 'border-border/60' : 'border-border/80'
      }`}
    >
      <div
        className={`relative isolate flex aspect-[16/7] items-end overflow-hidden p-4 sm:aspect-[16/6] ${
          finished
            ? 'bg-secondary/70'
            : 'bg-gradient-to-br from-accent via-secondary to-[#d7b69a] dark:to-[#554033]'
        }`}
        aria-hidden="true"
      >
        <div className="absolute -end-8 -top-20 size-56 rounded-full border border-primary/20 sm:size-64" />
        <div className="absolute -end-1 -top-13 size-44 rounded-full border border-primary/25 sm:size-52" />
        <div className="absolute end-10 -top-6 size-32 rounded-full bg-primary/10 sm:size-40" />
        <div className="absolute end-16 top-9 size-10 rounded-full border border-primary/25" />
        <div className="relative flex items-center gap-2 rounded-full bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur">
          <span
            className={`size-1.5 rounded-full ${
              finished ? 'bg-muted-foreground' : 'bg-primary'
            }`}
          />
          {t(finished ? 'finishedBadge' : 'activeStatus')}
        </div>
        <Coffee
          size={21}
          strokeWidth={1.3}
          className="relative ms-auto text-primary/70"
        />
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <header className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">
            {coffee.roastery?.name ?? t('roasteryNotSpecified')}
          </p>
          <h2 className="mt-1 break-words font-display text-2xl leading-tight tracking-[-0.035em] sm:text-[1.7rem]">
            {coffee.name}
          </h2>
        </header>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t('origin')}
            </dt>
            <dd className="mt-1 flex items-start gap-1.5 leading-5">
              <MapPin
                size={14}
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="break-words">
                {origin || t('originNotSpecified')}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t('roastLevelLabel')}
            </dt>
            <dd className="mt-1">
              {roastKey ? t(roastKey) : t('roastLevelNone')}
            </dd>
          </div>
        </dl>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t('processesLabel')}
          </p>
          <div className="mt-2 flex min-h-7 flex-wrap gap-1.5">
            {coffee.processes.length > 0 ? (
              coffee.processes.map((process) => (
                <span
                  key={process.id}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {process.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                {t('processesNotSpecified')}
              </span>
            )}
          </div>
        </div>

        {(coffee.varieties.length > 0 || coffee.flavors.length > 0) && (
          <div className="space-y-3">
            {coffee.varieties.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t('varietyLabel')}
                </p>
                <p className="mt-1 text-sm">
                  {coffee.varieties.map((variety) => variety.name).join(' · ')}
                </p>
              </div>
            )}
            {coffee.flavors.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t('flavorsLabel')}
                </p>
                <p className="mt-1 text-sm">
                  {coffee.flavors
                    .map(
                      ({ family, descriptor }) =>
                        `${family.name}: ${descriptor.name}`,
                    )
                    .join(' · ')}
                </p>
              </div>
            )}
          </div>
        )}

        <footer className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
          <span className="text-xs text-muted-foreground">
            {t(finished ? 'finishedBadge' : 'activeStatus')}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggleStatus(item)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
          >
            {finished ? (
              <RotateCcw size={14} aria-hidden="true" />
            ) : (
              <Check size={14} aria-hidden="true" />
            )}
            {t(finished ? 'markCoffeeActive' : 'markCoffeeFinished')}
          </button>
        </footer>
      </div>
    </article>
  )
}
