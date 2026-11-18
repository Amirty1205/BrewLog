import type { Language } from '@/app/providers/LanguageContext'
import type { Coffee } from '@/domain/coffee-records'
import type { ReferenceDataSnapshot } from '@/domain/reference-data'
import type { MyCoffeeCollectionItem } from './collection-types'

export type CollectionStatusFilter = 'all' | 'active' | 'finished'

export function filterMyCoffeeCollection(
  coffees: MyCoffeeCollectionItem[],
  search: string,
  status: CollectionStatusFilter,
  language: Language,
): MyCoffeeCollectionItem[] {
  const query = search.trim().toLocaleLowerCase(
    language === 'fa' ? 'fa-IR' : 'en-US',
  )
  const locale = language === 'fa' ? 'fa-IR' : 'en-US'
  return coffees.filter((item) => {
    if (status !== 'all' && item.myCoffee.status !== status) return false
    if (!query) return true

    return [item.coffee.name, item.coffee.roastery?.name].some((value) =>
      value?.toLocaleLowerCase(locale).includes(query),
    )
  })
}

export function filterCoffeeCatalog(
  coffees: Coffee[],
  search: string,
  language: Language,
  references?: ReferenceDataSnapshot,
): Coffee[] {
  const query = search.trim().toLocaleLowerCase(
    language === 'fa' ? 'fa-IR' : 'en-US',
  )
  if (!query) return coffees
  const locale = language === 'fa' ? 'fa-IR' : 'en-US'
  const roasteries = new Map(
    references?.roasteries.map((reference) => [
      reference.id,
      reference.name,
    ]) ?? [],
  )
  const origins = new Map(
    references?.origins.map((reference) => [reference.id, reference.name]) ??
      [],
  )
  return coffees.filter((coffee) =>
    [
      coffee.name,
      coffee.roasteryId ? roasteries.get(coffee.roasteryId) : undefined,
      coffee.originCountryId
        ? origins.get(coffee.originCountryId)
        : undefined,
      coffee.originRegionId ? origins.get(coffee.originRegionId) : undefined,
      coffee.originFarmId ? origins.get(coffee.originFarmId) : undefined,
    ].some((value) =>
      value?.toLocaleLowerCase(locale).includes(query),
    ),
  )
}
