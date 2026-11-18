import type { UUID } from '@/domain/shared'

const myCoffeesRoot = ['my-coffees'] as const
const myCoffeeCollectionRoot = ['my-coffee-collection'] as const
const coffeeCatalogRoot = ['coffee-catalog'] as const
const referenceDataRoot = ['reference-data'] as const
const productsRoot = ['products'] as const
const brewsRoot = ['brews'] as const
const weightAdjustmentsRoot = ['weight-adjustments'] as const
const coffeeSourcesRoot = ['coffee-sources'] as const
const roasteriesRoot = ['roasteries'] as const

export const queryKeys = {
  referenceData: {
    all: referenceDataRoot,
    snapshot: () => [...referenceDataRoot, 'snapshot'] as const,
  },
  coffeeCatalog: {
    all: coffeeCatalogRoot,
    list: () => [...coffeeCatalogRoot, 'list'] as const,
  },
  myCoffeeCollection: {
    all: myCoffeeCollectionRoot,
    list: () => [...myCoffeeCollectionRoot, 'list'] as const,
  },
  myCoffees: {
    all: myCoffeesRoot,
    list: () => [...myCoffeesRoot, 'list'] as const,
    details: () => [...myCoffeesRoot, 'detail'] as const,
    detail: (id: UUID) => [...myCoffeesRoot, 'detail', id] as const,
  },
  products: {
    all: productsRoot,
    list: () => [...productsRoot, 'list'] as const,
    details: () => [...productsRoot, 'detail'] as const,
    detail: (id: UUID) => [...productsRoot, 'detail', id] as const,
  },
  brews: {
    all: brewsRoot,
    byMyCoffee: (myCoffeeId: UUID) =>
      [...brewsRoot, 'my-coffee', myCoffeeId] as const,
  },
  weightAdjustments: {
    all: weightAdjustmentsRoot,
    byMyCoffee: (myCoffeeId: UUID) =>
      [...weightAdjustmentsRoot, 'my-coffee', myCoffeeId] as const,
  },
  coffeeSources: {
    all: coffeeSourcesRoot,
    list: () => [...coffeeSourcesRoot, 'list'] as const,
    details: () => [...coffeeSourcesRoot, 'detail'] as const,
    detail: (id: UUID) => [...coffeeSourcesRoot, 'detail', id] as const,
  },
  roasteries: {
    all: roasteriesRoot,
    list: () => [...roasteriesRoot, 'list'] as const,
    details: () => [...roasteriesRoot, 'detail'] as const,
    detail: (id: UUID) => [...roasteriesRoot, 'detail', id] as const,
  },
} as const
