import { useEffect, useState } from 'react'
import { Coffee, MapPin, Scale, Star, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/app/providers/LanguageContext'
import type { MyCoffeeListItem } from './viewModels'

interface CoffeeCardProps {
  coffee: MyCoffeeListItem
}

function useImageObjectUrl(blob: Blob | undefined): string | undefined {
  const [resource, setResource] = useState<
    { blob: Blob; url: string } | undefined
  >()

  useEffect(() => {
    if (!blob) {
      return
    }

    const nextUrl = URL.createObjectURL(blob)
    // Keep the browser-managed URL in state and revoke it when the Blob changes.
    // eslint-disable-next-line react/set-state-in-effect
    setResource({ blob, url: nextUrl })
    return () => URL.revokeObjectURL(nextUrl)
  }, [blob])

  return resource && resource.blob === blob ? resource.url : undefined
}

function formatNumber(value: number, language: 'en' | 'fa'): string {
  return new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en-US', {
    maximumFractionDigits: 1,
  }).format(value)
}

function sourceLocation(coffee: MyCoffeeListItem['sources'][number]): string {
  return [
    coffee.coffeeSource.farm ?? coffee.coffeeSource.producer,
    coffee.coffeeSource.region,
    coffee.coffeeSource.country,
  ]
    .filter((value): value is string => Boolean(value))
    .join(', ')
}

export function CoffeeCard({ coffee }: CoffeeCardProps) {
  const { language, t } = useLanguage()
  const imageUrl = useImageObjectUrl(coffee.productImage?.blob)
  const [failedImageUrl, setFailedImageUrl] = useState<string>()
  const sourceNames = coffee.sources.map(({ coffeeSource }) => coffeeSource.name)
  const altText = `${sourceNames.join(', ')} — ${coffee.product.name}`
  const showImage = imageUrl !== undefined && imageUrl !== failedImageUrl
  const numberLocale = language
  const locations = coffee.sources
    .map((source) => ({
      id: source.link.id,
      location: sourceLocation(source),
    }))
    .filter(({ location }) => location !== '')

  return (
    <Link
      to={`/coffees/${coffee.myCoffee.id}`}
      aria-label={`${altText} — ${coffee.roastery.name}`}
      className={`group grid grid-cols-1 overflow-hidden rounded-xl border text-card-foreground no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:grid-cols-[minmax(13rem,0.95fr)_minmax(0,1.05fr)] ${
        coffee.myCoffee.isFinished
          ? 'border-border/60 bg-muted/50 hover:bg-muted'
          : 'border-border/70 bg-card hover:bg-muted/60'
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary md:aspect-auto md:min-h-[17rem]">
        {showImage ? (
          <img
            src={imageUrl}
            alt={altText}
            className={`absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
              coffee.myCoffee.isFinished ? 'grayscale-[.18]' : ''
            }`}
            onError={() => setFailedImageUrl(imageUrl)}
          />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center bg-gradient-to-br from-accent to-secondary text-primary/70"
            aria-label={t('unavailableImage')}
          >
            <div className="flex flex-col items-center gap-2">
              <Coffee size={34} strokeWidth={1.2} aria-hidden="true" />
              <span className="text-center text-[10px]">{t('unavailableImage')}</span>
            </div>
          </div>
        )}
        {coffee.myCoffee.isFinished && (
          <span className="absolute start-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium text-foreground backdrop-blur">
            {t('finishedBadge')}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-between gap-4 p-4 sm:p-5 md:p-4">
        <div className="min-w-0">
          <p className="truncate text-[10px] leading-4 text-muted-foreground">
            <span>{t('productLabel')} · </span>
            <span className="font-medium text-foreground">
              {coffee.product.name}
            </span>
          </p>
          <p className="truncate text-[10px] leading-4 text-muted-foreground">
            <span>{t('roasteryLabel')} · </span>
            {coffee.roastery.name}
          </p>
          <h2 className="mt-1 font-display text-lg leading-snug tracking-[-0.025em] text-foreground sm:text-xl">
            {coffee.sources.map(({ link, coffeeSource }, index) => (
              <span key={link.id}>
                {index > 0 && <span aria-hidden="true"> · </span>}
                {coffeeSource.name}
              </span>
            ))}
          </h2>

          {locations.length > 0 && (
            <div className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
              <MapPin
                size={14}
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-[10px]">{t('origin')}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {locations.map(({ id, location }) => (
                    <span
                      key={id}
                      className="rounded-md bg-muted px-2 py-1 text-[11px] leading-4 text-muted-foreground"
                    >
                      {location}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(coffee.product.roasterCuppingScore !== undefined ||
            coffee.myCoffee.personalCoffeeRating !== undefined) && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {coffee.product.roasterCuppingScore !== undefined && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Coffee size={13} className="text-primary" aria-hidden="true" />
                  <span>
                    {t('cuppingScore')}:{' '}
                    <span className="font-medium text-foreground">
                      {formatNumber(
                        coffee.product.roasterCuppingScore,
                        numberLocale,
                      )}
                    </span>
                  </span>
                </span>
              )}
              {coffee.myCoffee.personalCoffeeRating !== undefined && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Star
                    size={13}
                    className="fill-primary text-primary"
                    aria-hidden="true"
                  />
                  <span>
                    {t('personalRating')}:{' '}
                    <span className="font-medium text-foreground">
                      {formatNumber(
                        coffee.myCoffee.personalCoffeeRating,
                        numberLocale,
                      )}
                      <span aria-hidden="true">/10</span>
                    </span>
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 border-t border-border/70 pt-3 text-xs">
          <div className="flex min-w-0 items-center gap-1.5">
            <Scale
              size={14}
              className="shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="truncate">
              <span className="text-muted-foreground">
                {t('remainingWeight')}:{' '}
              </span>
              <span className="text-foreground">
                {formatNumber(coffee.myCoffee.remainingWeightGrams, numberLocale)}{' '}
                {t('gramsUnit')}
              </span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <Wallet
              size={14}
              className="shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="truncate">
              <span className="text-muted-foreground">
                {t('purchasePrice')}:{' '}
              </span>
              <span className="text-foreground">
                {formatNumber(coffee.myCoffee.purchasePriceToman, numberLocale)}{' '}
                {t('tomanUnit')}
              </span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
