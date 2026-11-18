import { describe, expect, it } from 'vitest'
import { CoffeeSchema, MyCoffeeSchema } from '@/domain/coffee-records'
import { UUIDSchema } from '@/domain/shared'
import type { MyCoffeeCollectionItem } from './collection-types'
import {
  filterCoffeeCatalog,
  filterMyCoffeeCollection,
} from './collection-utils'

const createdAt = new Date('2025-01-01T00:00:00.000Z')

function collectionItem(
  sequence: number,
  status: 'active' | 'finished' = 'active',
): MyCoffeeCollectionItem {
  const coffee = CoffeeSchema.parse({
    id: UUIDSchema.parse(
      `10000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
    ),
    name: sequence === 1 ? 'Citrus Lot' : 'Chocolate Blend',
    roasteryId: UUIDSchema.parse(
      `30000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
    ),
    originRegionId: UUIDSchema.parse(
      `40000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
    ),
    roastLevel: 'light',
    createdAt,
    updatedAt: createdAt,
  })
  const resolvedCoffee = {
    ...coffee,
    roastery: {
      id: coffee.roasteryId!,
      name: sequence === 1 ? 'Northstar Roastery' : 'South Roast',
      normalizedName: sequence === 1 ? 'northstar roastery' : 'south roast',
      source: 'custom' as const,
      createdAt,
    },
    originRegion: {
      id: coffee.originRegionId!,
      name: sequence === 1 ? 'Yirgacheffe' : 'Huila',
      normalizedName: sequence === 1 ? 'yirgacheffe' : 'huila',
      normalizedKey: `region:${sequence}`,
      kind: 'region' as const,
      parentId: UUIDSchema.parse(
        `50000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
      ),
      source: 'custom' as const,
      createdAt,
    },
    varieties: [],
    processes: [],
    flavors: [],
  }
  const myCoffee = MyCoffeeSchema.parse({
    id: UUIDSchema.parse(
      `20000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
    ),
    coffeeId: coffee.id,
    status,
    createdAt,
    updatedAt: createdAt,
  })
  return { coffee: resolvedCoffee, myCoffee }
}

describe('Coffee collection filters', () => {
  it('searches by coffee name and roastery and filters personal status', () => {
    const active = collectionItem(1)
    const finished = collectionItem(2, 'finished')
    const collection = [active, finished]

    expect(filterMyCoffeeCollection(collection, 'CITRUS', 'all', 'en')).toEqual([
      active,
    ])
    expect(
      filterMyCoffeeCollection(collection, 'northstar', 'active', 'en'),
    ).toEqual([active])
    expect(
      filterMyCoffeeCollection(collection, 'south roast', 'finished', 'en'),
    ).toEqual([finished])
    expect(filterMyCoffeeCollection(collection, '', 'active', 'en')).toEqual([
      active,
    ])
    expect(
      filterMyCoffeeCollection(collection, 'no match', 'all', 'en'),
    ).toEqual([])
  })

  it('searches the local catalog by name, roastery, or origin', () => {
    const item = collectionItem(1).coffee
    const catalog = [item]
    const references = {
      roasteries: [item.roastery!],
      origins: [item.originRegion!],
      varieties: [],
      processingMethods: [],
      flavorFamilies: [],
      flavorDescriptors: [],
    }

    expect(
      filterCoffeeCatalog(catalog, 'YIRGACHEFFE', 'en', references),
    ).toEqual([item])
    expect(filterCoffeeCatalog(catalog, ' northstar ', 'en', references)).toEqual([
      item,
    ])
    expect(filterCoffeeCatalog(catalog, 'missing', 'en', references)).toEqual([])
    expect(filterCoffeeCatalog(catalog, ' ', 'fa', references)).toBe(catalog)
  })
})
