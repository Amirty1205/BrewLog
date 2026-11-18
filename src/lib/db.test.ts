import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import {
  CoffeeSourceSchema,
  MyCoffeeSchema,
  ProductSchema,
  ProductSourceSchema,
  RoasterySchema,
} from '@/domain/coffee'
import { CoffeeSchema } from '@/domain/coffee-records'
import { UUIDSchema } from '@/domain/shared'
import type { LegacyBrewRecord, LegacyCoffeeRecord } from '@/types/database'
import { BrewlogDatabase } from './db'
import { normalizeReferenceName } from './reference-data/utils'

const timestamp = '2025-01-01T00:00:00.000Z'

function entity(id: string) {
  return {
    id: UUIDSchema.parse(id),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function testDatabaseName() {
  return `Brewlog-test-${crypto.randomUUID()}`
}

describe('BrewlogDatabase schema', () => {
  it('adds domain tables and indexes without dropping v1 records', async () => {
    const name = testDatabaseName()
    const oldDatabase = new Dexie(name)
    oldDatabase.version(1).stores({
      coffees: 'id, createdAt, updatedAt',
      brews: 'id, coffeeId, createdAt, updatedAt',
    })
    await oldDatabase.open()

    const legacyCoffee: LegacyCoffeeRecord = {
      id: 'legacy-coffee-id',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const legacyBrew: LegacyBrewRecord = {
      id: 'legacy-brew-id',
      coffeeId: legacyCoffee.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await oldDatabase.table('coffees').put(legacyCoffee)
    await oldDatabase.table('brews').put(legacyBrew)
    oldDatabase.close()

    const database = new BrewlogDatabase(name)
    try {
      await database.open()

      expect(database.verno).toBe(4)
      expect(await database.coffees.get(legacyCoffee.id)).toEqual(legacyCoffee)
      expect(await database.brews.get(legacyBrew.id)).toEqual(legacyBrew)
      expect(database.tables.map((table) => table.name)).toEqual(
        expect.arrayContaining([
          'coffeeSources',
          'coffeeCatalog',
          'roasteries',
          'products',
          'productSources',
          'myCoffees',
          'myCoffeeCollection',
          'referenceRoasteries',
          'originReferences',
          'coffeeVarieties',
          'processingMethods',
          'flavorFamilies',
          'flavorDescriptors',
          'brewRecords',
          'weightAdjustments',
          'imageAssets',
        ]),
      )
      expect(
        database.productSources.schema.indexes.some(
          (index) =>
            index.name === '[productId+coffeeSourceId]' && index.unique,
        ),
      ).toBe(true)
      expect(
        database.coffeeCatalog.schema.indexes.some(
          (index) => index.name === 'processIds' && index.multi,
        ),
      ).toBe(true)
      expect(
        database.coffeeCatalog.schema.indexes.some(
          (index) => index.name === 'varietyIds' && index.multi,
        ),
      ).toBe(true)
      expect(
        database.myCoffeeCollection.schema.indexes.some(
          (index) => index.name === '[coffeeId+status]',
        ),
      ).toBe(true)
    } finally {
      database.close()
      await Dexie.delete(name)
    }
  })

  it('migrates existing coffee text values to references without losing unmatched data', async () => {
    const name = testDatabaseName()
    const oldDatabase = new Dexie(name)
    oldDatabase.version(1).stores({
      coffees: 'id, createdAt, updatedAt',
      brews: 'id, coffeeId, createdAt, updatedAt',
    })
    oldDatabase.version(2).stores({
      coffees: 'id, createdAt, updatedAt',
      brews: 'id, coffeeId, createdAt, updatedAt',
      coffeeSources: 'id, name, createdAt, updatedAt',
    })
    oldDatabase.version(3).stores({
      coffees: 'id, createdAt, updatedAt',
      brews: 'id, coffeeId, createdAt, updatedAt',
      coffeeSources: 'id, name, createdAt, updatedAt',
      coffeeCatalog:
        'id, name, roastery, origin, region, farm, *variety, *processes, createdAt, updatedAt',
      myCoffeeCollection: 'id, coffeeId, status, createdAt, updatedAt',
    })
    await oldDatabase.open()
    const legacyCoffee = {
      id: UUIDSchema.parse('10000000-0000-4000-8000-000000000001'),
      name: 'Legacy Lot',
      roastery: 'Northstar Roastery',
      origin: 'Ethiopia',
      region: 'Guji',
      farm: 'Benti Nenka',
      variety: ['Heirloom', 'Custom heirloom'],
      processes: ['Natural', 'Experimental fermentation'],
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
    }
    await oldDatabase.table('coffeeCatalog').put(legacyCoffee)
    oldDatabase.close()

    const database = new BrewlogDatabase(name)
    try {
      await database.open()
      const coffee = CoffeeSchema.parse(
        await database.coffeeCatalog.get(legacyCoffee.id),
      )
      const reference = async (
        tableName: string,
        id: string | undefined,
      ): Promise<{ name: string } | undefined> =>
        id ? database.table(tableName).get(id) : undefined

      expect(coffee.name).toBe('Legacy Lot')
      expect(coffee.createdAt).toEqual(legacyCoffee.createdAt)
      expect(coffee.varietyIds).toHaveLength(2)
      expect(coffee.processIds).toHaveLength(2)
      expect(
        await reference('referenceRoasteries', coffee.roasteryId),
      ).toMatchObject({ name: 'Northstar Roastery' })
      expect(
        await reference('originReferences', coffee.originCountryId),
      ).toMatchObject({ name: 'Ethiopia', kind: 'country' })
      expect(
        await reference('originReferences', coffee.originRegionId),
      ).toMatchObject({ name: 'Guji', kind: 'region' })
      expect(
        await reference('originReferences', coffee.originFarmId),
      ).toMatchObject({ name: 'Benti Nenka', kind: 'farm' })
      const varieties = await database.coffeeVarieties.toArray()
      const processes = await database.processingMethods.toArray()
      expect(
        varieties.find((entry) => entry.id === coffee.varietyIds[0]),
      ).toMatchObject({ name: 'Heirloom', source: 'system' })
      expect(
        processes.find((entry) => entry.id === coffee.processIds[0]),
      ).toMatchObject({ name: 'Natural', source: 'system' })
      expect(
        varieties.find(
          (entry) =>
            entry.normalizedName === normalizeReferenceName('Custom heirloom'),
        ),
      ).toMatchObject({ name: 'Custom heirloom', source: 'custom' })
      expect(
        processes.find(
          (entry) =>
            entry.normalizedName ===
            normalizeReferenceName('Experimental fermentation'),
        ),
      ).toMatchObject({
        name: 'Experimental fermentation',
        source: 'custom',
      })
    } finally {
      database.close()
      await Dexie.delete(name)
    }
  })

  it('stores multiple source links and bags against one product', async () => {
    const database = new BrewlogDatabase(testDatabaseName())
    try {
      await database.open()
      const roastery = RoasterySchema.parse({
        ...entity('40000000-0000-4000-8000-000000000001'),
        name: 'North Roast',
      })
      const product = ProductSchema.parse({
        ...entity('20000000-0000-4000-8000-000000000001'),
        name: 'House Blend',
        roasteryId: roastery.id,
      })
      const sources = [
        CoffeeSourceSchema.parse({
          ...entity('30000000-0000-4000-8000-000000000001'),
          name: 'Guji',
        }),
        CoffeeSourceSchema.parse({
          ...entity('30000000-0000-4000-8000-000000000002'),
          name: 'Huila',
        }),
      ]
      const sourceLinks = sources.map((source, index) =>
        ProductSourceSchema.parse({
          ...entity(
            `50000000-0000-4000-8000-${(index + 1)
              .toString()
              .padStart(12, '0')}`,
          ),
          productId: product.id,
          coffeeSourceId: source.id,
          ...(index === 0 ? { blendProportionPercent: 40 } : {}),
        }),
      )
      const bags = [
        MyCoffeeSchema.parse({
          ...entity('10000000-0000-4000-8000-000000000001'),
          productId: product.id,
          purchasePriceToman: 900_000,
          packageWeightGrams: 250,
          purchaseDate: '2025-01-01',
        }),
        MyCoffeeSchema.parse({
          ...entity('10000000-0000-4000-8000-000000000002'),
          productId: product.id,
          purchasePriceToman: 950_000,
          packageWeightGrams: 250,
          purchaseDate: '2025-02-01',
        }),
      ]

      await database.transaction(
        'rw',
        database.roasteries,
        database.products,
        database.coffeeSources,
        database.productSources,
        database.myCoffees,
        async () => {
          await database.roasteries.add(roastery)
          await database.products.add(product)
          await database.coffeeSources.bulkAdd(sources)
          await database.productSources.bulkAdd(sourceLinks)
          await database.myCoffees.bulkAdd(bags)
        },
      )

      expect(
        await database.productSources
          .where('productId')
          .equals(product.id)
          .count(),
      ).toBe(2)
      expect(
        await database.myCoffees.where('productId').equals(product.id).count(),
      ).toBe(2)
      expect(sourceLinks[1].blendProportionPercent).toBeUndefined()
    } finally {
      await database.delete()
    }
  })
})
