import { AlertCircle, Coffee, Plus, Search } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useLanguage } from '@/app/providers/LanguageContext'
import { presentError } from '@/app/errorPresentation'
import { CoffeeCollectionCard } from './CoffeeCollectionCard'
import {
  useMyCoffeeCollection,
  useUpdateMyCoffeeCollectionStatus,
} from './collection-api'
import type { MyCoffeeCollectionItem } from './collection-types'
import {
  filterMyCoffeeCollection,
  type CollectionStatusFilter,
} from './collection-utils'

const EMPTY_COLLECTION: MyCoffeeCollectionItem[] = []
const AddCoffeeDialog = lazy(async () => {
  const module = await import('./AddCoffeeDialog')
  return { default: module.AddCoffeeDialog }
})

function CollectionHeader({ onAdd }: { onAdd: () => void }) {
  const { t } = useLanguage()

  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-primary">
          {t('coffeesEyebrow')}
        </p>
        <h1
          id="my-coffees-title"
          className="font-display text-4xl tracking-[-0.045em] sm:text-5xl"
        >
          {t('coffeesTitle')}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
          {t('coffeesDescription')}
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:self-auto"
      >
        <Plus size={17} aria-hidden="true" />
        {t('addCoffee')}
      </button>
    </header>
  )
}

function CollectionLoading() {
  const { t } = useLanguage()
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">{t('coffeeCollectionLoading')}</span>
      <div className="h-11 max-w-xl animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-80 animate-pulse rounded-2xl border border-border/70 bg-card"
          />
        ))}
      </div>
    </div>
  )
}

function CollectionError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  const { t } = useLanguage()
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-xl border border-destructive/30 bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          size={20}
          className="mt-0.5 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div>
          <h2 className="font-medium">{t('coffeeCollectionError')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(presentError(error).messageKey)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {t('retry')}
      </button>
    </div>
  )
}

function EmptyCollection({
  filtered,
  onAdd,
}: {
  filtered: boolean
  onAdd: () => void
}) {
  const { t } = useLanguage()
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center sm:px-10">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
        <Coffee size={22} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h2 className="mt-5 font-display text-2xl tracking-[-0.03em]">
        {t(filtered ? 'noFilteredCoffees' : 'emptyCollectionTitle')}
      </h2>
      {!filtered && (
        <>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {t('emptyCollectionDescription')}
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus size={16} aria-hidden="true" />
            {t('emptyCatalogAction')}
          </button>
        </>
      )}
    </div>
  )
}

export function MyCoffeesPage() {
  const { language, t } = useLanguage()
  const collectionQuery = useMyCoffeeCollection()
  const updateStatus = useUpdateMyCoffeeCollectionStatus()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CollectionStatusFilter>('all')
  const [isAddingCoffee, setIsAddingCoffee] = useState(false)
  const [statusError, setStatusError] = useState(false)
  const coffees = collectionQuery.data ?? EMPTY_COLLECTION
  const filteredCoffees = useMemo(
    () => filterMyCoffeeCollection(coffees, search, status, language),
    [coffees, language, search, status],
  )

  async function toggleStatus(item: MyCoffeeCollectionItem) {
    setStatusError(false)
    try {
      await updateStatus.mutateAsync({
        id: item.myCoffee.id,
        status: item.myCoffee.status === 'active' ? 'finished' : 'active',
      })
    } catch {
      setStatusError(true)
    }
  }

  return (
    <section aria-labelledby="my-coffees-title" className="space-y-8">
      <CollectionHeader onAdd={() => setIsAddingCoffee(true)} />

      {collectionQuery.isPending && <CollectionLoading />}
      {!collectionQuery.isPending && collectionQuery.error && (
        <CollectionError
          error={collectionQuery.error}
          onRetry={() => void collectionQuery.refetch()}
        />
      )}

      {statusError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive"
        >
          {t('updateStatusError')}
        </p>
      )}

      {!collectionQuery.isPending &&
        !collectionQuery.error &&
        collectionQuery.data && (
          <>
            {coffees.length > 0 && (
              <div className="flex flex-col gap-3 border-y border-border/70 py-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="relative block w-full sm:max-w-sm">
                  <span className="sr-only">{t('searchCoffeesLabel')}</span>
                  <Search
                    size={17}
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.currentTarget.value)}
                    placeholder={t('searchCoffeesPlaceholder')}
                    className="h-11 w-full rounded-lg border border-input bg-card ps-10 pe-4 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                </label>
                <div
                  role="group"
                  aria-label={t('collectionStatusFilter')}
                  className="flex w-full rounded-full border border-border bg-card p-1 sm:w-auto"
                >
                  {(
                    [
                      ['all', 'filterAll'],
                      ['active', 'filterActive'],
                      ['finished', 'filterFinished'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={status === value}
                      onClick={() => setStatus(value)}
                      className={`min-h-9 flex-1 rounded-full px-3 text-xs font-medium transition-colors sm:flex-none ${
                        status === value
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t(label)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {coffees.length === 0 ? (
              <EmptyCollection
                filtered={false}
                onAdd={() => setIsAddingCoffee(true)}
              />
            ) : filteredCoffees.length === 0 ? (
              <EmptyCollection
                filtered
                onAdd={() => setIsAddingCoffee(true)}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCoffees.map((item) => (
                  <CoffeeCollectionCard
                    key={item.myCoffee.id}
                    item={item}
                    busy={updateStatus.isPending}
                    onToggleStatus={(coffee) => void toggleStatus(coffee)}
                  />
                ))}
              </div>
            )}
          </>
        )}

      {isAddingCoffee && (
        <Suspense
          fallback={
            <p role="status" className="text-sm text-muted-foreground">
              {t('loadingAddCoffee')}
            </p>
          }
        >
          <AddCoffeeDialog onClose={() => setIsAddingCoffee(false)} />
        </Suspense>
      )}
    </section>
  )
}
