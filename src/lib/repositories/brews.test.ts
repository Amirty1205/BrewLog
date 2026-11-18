import { describe, expect, it } from 'vitest'
import { UUIDSchema } from '@/domain/shared'
import { BrewlogDatabase } from '../db'
import { InvalidReferenceError, MissingRecordError } from '../domain-errors'
import { recordWeightAdjustment } from '../weight-adjustments'
import { createMyCoffee, getMyCoffee } from './my-coffees'
import {
  createBrew,
  deleteBrew,
  getBrew,
  listBrewsForMyCoffee,
  updateBrew,
} from './brews'
import {
  brew as brewFixture,
  seedProduct,
  weightAdjustment,
} from '@/test/repository-fixtures'

function testDatabase() {
  return new BrewlogDatabase(`Brewlog-brews-${crypto.randomUUID()}`)
}

async function createBag(
  database: BrewlogDatabase,
  sequence: number,
  packageWeightGrams = 250,
) {
  const { product } = await seedProduct(database, sequence)
  return createMyCoffee(database, {
    id: UUIDSchema.parse(
      `10000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
    ),
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    productId: product.id,
    purchasePriceToman: 850_000,
    packageWeightGrams,
    purchaseDate: '2025-01-01',
  })
}

describe('Brew repository', () => {
  it('creates, retrieves, lists, updates, and deletes brews while recalculating weight', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const bag = await createBag(database, 1)
      const brew = await createBrew(database, {
        ...brewFixture(bag.id, 1, 15),
        personalBrewRating: 8,
        personalTastingNotes: 'Apricot, cacao',
      })

      expect((await getMyCoffee(database, bag.id)).remainingWeightGrams).toBe(235)
      expect(await getBrew(database, brew.id)).toEqual(brew)
      expect(await listBrewsForMyCoffee(database, bag.id)).toEqual([brew])

      const updated = await updateBrew(database, brew.id, {
        coffeeDoseGrams: 20,
      })
      expect(updated.coffeeDoseGrams).toBe(20)
      expect(updated.personalBrewRating).toBe(8)
      expect(updated.personalTastingNotes).toBe('Apricot, cacao')
      expect((await getMyCoffee(database, bag.id)).remainingWeightGrams).toBe(230)

      await deleteBrew(database, brew.id)
      expect((await getMyCoffee(database, bag.id)).remainingWeightGrams).toBe(250)
      await expect(getBrew(database, brew.id)).rejects.toBeInstanceOf(
        MissingRecordError,
      )
    } finally {
      await database.delete()
    }
  })

  it('validates missing records and parent references', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const input = brewFixture(
        UUIDSchema.parse('10000000-0000-4000-8000-000000000099'),
      )
      await expect(createBrew(database, input)).rejects.toBeInstanceOf(
        InvalidReferenceError,
      )
      await expect(
        updateBrew(database, input.id, { coffeeDoseGrams: 10 }),
      ).rejects.toBeInstanceOf(MissingRecordError)
      await expect(deleteBrew(database, input.id)).rejects.toBeInstanceOf(
        MissingRecordError,
      )
      await expect(
        listBrewsForMyCoffee(database, input.myCoffeeId),
      ).rejects.toBeInstanceOf(MissingRecordError)
    } finally {
      await database.delete()
    }
  })

  it('moves a brew between bags and recalculates both within one transaction', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const oldBag = await createBag(database, 1, 250)
      const newBag = await createBag(database, 2, 200)
      const brew = await createBrew(
        database,
        brewFixture(oldBag.id, 1, 15),
      )
      expect((await getMyCoffee(database, oldBag.id)).remainingWeightGrams).toBe(
        235,
      )

      await updateBrew(database, brew.id, {
        myCoffeeId: newBag.id,
        coffeeDoseGrams: 10,
      })
      expect((await getMyCoffee(database, oldBag.id)).remainingWeightGrams).toBe(
        250,
      )
      expect((await getMyCoffee(database, newBag.id)).remainingWeightGrams).toBe(
        190,
      )
    } finally {
      await database.delete()
    }
  })

  it('preserves a manual checkpoint when historical brews are edited or deleted', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const bag = await createBag(database, 1)
      const historicalBrew = await createBrew(
        database,
        brewFixture(bag.id, 1, 20, '2025-01-02T00:00:00.000Z'),
      )
      const checkpoint = weightAdjustment(
        bag.id,
        1,
        180,
        '2025-01-03T00:00:00.000Z',
      )
      await recordWeightAdjustment(database, checkpoint)
      const laterBrew = await createBrew(
        database,
        brewFixture(bag.id, 2, 10, '2025-01-04T00:00:00.000Z'),
      )
      expect((await getMyCoffee(database, bag.id)).remainingWeightGrams).toBe(
        170,
      )

      await updateBrew(database, historicalBrew.id, {
        coffeeDoseGrams: 80,
      })
      expect((await getMyCoffee(database, bag.id)).remainingWeightGrams).toBe(
        170,
      )
      expect((await getMyCoffee(database, bag.id)).remainingWeightStatus).toBe(
        'manually-corrected',
      )

      await deleteBrew(database, laterBrew.id)
      const afterDelete = await getMyCoffee(database, bag.id)
      expect(afterDelete.remainingWeightGrams).toBe(180)
      expect(afterDelete.remainingWeightAdjustmentId).toBe(checkpoint.id)
    } finally {
      await database.delete()
    }
  })

  it('rolls back a Brew move if the second bag recalculation fails', async () => {
    const database = testDatabase()
    let hookAttached = false
    const rejectNewBagUpdate = (
      _modifications: unknown,
      primaryKey: IDBValidKey,
    ) => {
      if (primaryKey === '10000000-0000-4000-8000-000000000002') {
        throw new Error('forced new bag update failure')
      }
    }
    try {
      await database.open()
      const oldBag = await createBag(database, 1, 250)
      const newBag = await createBag(database, 2, 200)
      const brew = await createBrew(
        database,
        brewFixture(oldBag.id, 1, 15),
      )
      const originalOldBag = await getMyCoffee(database, oldBag.id)
      const originalNewBag = await getMyCoffee(database, newBag.id)

      database.myCoffees.hook('updating', rejectNewBagUpdate)
      hookAttached = true
      await expect(
        updateBrew(database, brew.id, {
          myCoffeeId: newBag.id,
          coffeeDoseGrams: 10,
        }),
      ).rejects.toThrow('forced new bag update failure')

      expect(await getBrew(database, brew.id)).toEqual(brew)
      expect(await getMyCoffee(database, oldBag.id)).toEqual(originalOldBag)
      expect(await getMyCoffee(database, newBag.id)).toEqual(originalNewBag)
      expect(originalOldBag.remainingWeightGrams).toBe(235)
      expect(originalNewBag.remainingWeightGrams).toBe(200)
    } finally {
      if (hookAttached) {
        database.myCoffees.hook('updating').unsubscribe(rejectNewBagUpdate)
      }
      await database.delete()
    }
  })

  it('rolls back a brew write that would make remaining weight negative', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const bag = await createBag(database, 1, 10)

      await expect(
        createBrew(database, brewFixture(bag.id, 1, 11)),
      ).rejects.toThrow('Brew doses exceed')
      expect(await database.brewRecords.count()).toBe(0)
      expect((await getMyCoffee(database, bag.id)).remainingWeightGrams).toBe(10)
    } finally {
      await database.delete()
    }
  })
})
