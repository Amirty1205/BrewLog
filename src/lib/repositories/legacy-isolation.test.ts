import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import type { LegacyBrewRecord, LegacyCoffeeRecord } from '@/types/database'
import { BrewlogDatabase } from '../db'
import { recordWeightAdjustment } from '../weight-adjustments'
import { createBrew } from './brews'
import {
  createCoffeeSource,
  deleteCoffeeSource,
} from './coffee-sources'
import { createMyCoffee, deleteMyCoffee } from './my-coffees'
import { createProduct, deleteProduct } from './products'
import { createRoastery, deleteRoastery } from './roasteries'
import {
  brew,
  coffeeSource,
  myCoffee,
  product,
  productSource,
  roastery,
  weightAdjustment,
} from '@/test/repository-fixtures'

describe('repository legacy-store isolation', () => {
  it('does not alter legacy v1 rows during domain workflows', async () => {
    const name = `Brewlog-legacy-isolation-${crypto.randomUUID()}`
    const legacyDatabase = new Dexie(name)
    legacyDatabase.version(1).stores({
      coffees: 'id, createdAt, updatedAt',
      brews: 'id, coffeeId, createdAt, updatedAt',
    })
    await legacyDatabase.open()
    const legacyCoffee: LegacyCoffeeRecord = {
      id: 'legacy-coffee-id',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }
    const legacyBrew: LegacyBrewRecord = {
      id: 'legacy-brew-id',
      coffeeId: legacyCoffee.id,
      createdAt: legacyCoffee.createdAt,
      updatedAt: legacyCoffee.updatedAt,
    }
    await legacyDatabase.table('coffees').put(legacyCoffee)
    await legacyDatabase.table('brews').put(legacyBrew)
    legacyDatabase.close()

    const database = new BrewlogDatabase(name)
    try {
      await database.open()
      const source = coffeeSource(1)
      const roaster = roastery(1)
      const item = product(roaster.id, 1)
      const sourceLink = productSource(item.id, source.id, 1, 100)
      const bag = myCoffee(item.id, 1)
      const brewRecord = brew(bag.id, 1)

      await createCoffeeSource(database, source)
      await createRoastery(database, roaster)
      await createProduct(database, {
        product: item,
        sources: [sourceLink],
      })
      await createMyCoffee(database, {
        id: bag.id,
        createdAt: bag.createdAt,
        updatedAt: bag.updatedAt,
        productId: bag.productId,
        purchasePriceToman: bag.purchasePriceToman,
        packageWeightGrams: bag.packageWeightGrams,
        purchaseDate: bag.purchaseDate,
      })
      await createBrew(database, brewRecord)
      await recordWeightAdjustment(database, weightAdjustment(bag.id))
      await deleteMyCoffee(database, bag.id)
      await deleteProduct(database, item.id)
      await deleteCoffeeSource(database, source.id)
      await deleteRoastery(database, roaster.id)

      expect(await database.coffees.get(legacyCoffee.id)).toEqual(legacyCoffee)
      expect(await database.brews.get(legacyBrew.id)).toEqual(legacyBrew)
    } finally {
      await database.delete()
    }
  })
})
