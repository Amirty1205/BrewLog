import { describe, expect, it } from 'vitest'
import { UUIDSchema } from '@/domain/shared'
import { MyCoffeeDetailsUpdateSchema } from '@/domain/coffee'
import { BrewlogDatabase } from '../db'
import { MissingRecordError, InvalidReferenceError } from '../domain-errors'
import { recordWeightAdjustment } from '../weight-adjustments'
import { createBrew } from './brews'
import {
  createMyCoffee,
  deleteMyCoffee,
  getMyCoffee,
  listMyCoffees,
  markMyCoffeeFinished,
  updateMyCoffee,
} from './my-coffees'
import { seedProduct, weightAdjustment, brew as brewFixture } from '@/test/repository-fixtures'

function testDatabase() {
  return new BrewlogDatabase(`Brewlog-bags-${crypto.randomUUID()}`)
}

describe('MyCoffee repository', () => {
  it('creates a validated bag with package weight as an estimated baseline', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const { product } = await seedProduct(database)
      const input = {
        id: UUIDSchema.parse('10000000-0000-4000-8000-000000000001'),
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        productId: product.id,
        purchasePriceToman: 850_000,
        packageWeightGrams: 250,
        purchaseDate: '2025-01-01',
        personalCoffeeRating: 8,
      }

      const created = await createMyCoffee(database, input)
      expect(created.remainingWeightGrams).toBe(250)
      expect(created.remainingWeightStatus).toBe('estimated')
      expect(created.personalCoffeeRating).toBe(8)
      expect(await getMyCoffee(database, created.id)).toEqual(created)
      expect(await listMyCoffees(database)).toEqual([created])
    } finally {
      await database.delete()
    }
  })

  it('validates purchase constraints and product references', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const { product } = await seedProduct(database)
      const input = {
        id: UUIDSchema.parse('10000000-0000-4000-8000-000000000001'),
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        productId: product.id,
        purchasePriceToman: -1,
        packageWeightGrams: 250,
        purchaseDate: '2025-01-01',
      }
      const missingId = UUIDSchema.parse(
        '10000000-0000-4000-8000-000000000099',
      )
      await expect(getMyCoffee(database, missingId)).rejects.toBeInstanceOf(
        MissingRecordError,
      )
      await expect(
        updateMyCoffee(database, missingId, { purchasePriceToman: 10 }),
      ).rejects.toBeInstanceOf(MissingRecordError)
      await expect(createMyCoffee(database, input)).rejects.toThrow()
      await expect(
        createMyCoffee(database, {
          ...input,
          id: UUIDSchema.parse('10000000-0000-4000-8000-000000000002'),
          purchasePriceToman: 10,
          purchaseDate: 'not-a-date',
        }),
      ).rejects.toThrow()
      const stateOverride = {
        ...input,
        purchasePriceToman: 10,
        remainingWeightGrams: 10,
      }
      await expect(
        createMyCoffee(database, stateOverride),
      ).rejects.toThrow()
      await expect(
        createMyCoffee(database, {
          ...input,
          id: UUIDSchema.parse('10000000-0000-4000-8000-000000000003'),
          purchasePriceToman: 10,
          productId: UUIDSchema.parse(
            '20000000-0000-4000-8000-000000000099',
          ),
        }),
      ).rejects.toBeInstanceOf(InvalidReferenceError)
    } finally {
      await database.delete()
    }
  })

  it('preserves omitted and undefined fields and clears nullable optional fields', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const { product } = await seedProduct(database)
      const created = await createMyCoffee(database, {
        id: UUIDSchema.parse('10000000-0000-4000-8000-000000000001'),
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        productId: product.id,
        purchasePriceToman: 850_000,
        packageWeightGrams: 250,
        purchaseDate: '2025-01-01',
        roastDate: '2025-01-02',
        personalCoffeeRating: 8,
        preGround: true,
        intendedBrewMethod: 'V60',
        originalRoasterGrindDescription: 'Medium-fine',
      })
      const checkpoint = weightAdjustment(created.id, 1, 150)
      await recordWeightAdjustment(database, checkpoint)
      await markMyCoffeeFinished(database, created.id, true)

      const updated = await updateMyCoffee(database, created.id, {
        purchasePriceToman: 900_000,
      })
      expect(updated.purchasePriceToman).toBe(900_000)
      expect(updated.remainingWeightGrams).toBe(150)
      expect(updated.remainingWeightStatus).toBe('manually-corrected')
      expect(updated.personalCoffeeRating).toBe(8)
      expect(updated.remainingWeightAdjustmentId).toBe(checkpoint.id)
      expect(updated.isFinished).toBe(true)
      expect(updated.roastDate).toBe('2025-01-02')

      const undefinedUpdated = await updateMyCoffee(database, created.id, {
        personalCoffeeRating: undefined,
        roastDate: undefined,
        isFinished: undefined,
        preGround: undefined,
        intendedBrewMethod: undefined,
        originalRoasterGrindDescription: undefined,
      })
      expect(undefinedUpdated.personalCoffeeRating).toBe(8)
      expect(undefinedUpdated.roastDate).toBe('2025-01-02')
      expect(undefinedUpdated.isFinished).toBe(true)
      expect(undefinedUpdated.preGround).toBe(true)
      expect(undefinedUpdated.intendedBrewMethod).toBe('V60')
      expect(undefinedUpdated.originalRoasterGrindDescription).toBe(
        'Medium-fine',
      )
      expect(undefinedUpdated.remainingWeightGrams).toBe(150)
      expect(undefinedUpdated.remainingWeightAdjustmentId).toBe(
        updated.remainingWeightAdjustmentId,
      )

      const cleared = await updateMyCoffee(database, created.id, {
        roastDate: null,
        personalCoffeeRating: null,
        intendedBrewMethod: null,
        originalRoasterGrindDescription: null,
      })
      expect(cleared.roastDate).toBeUndefined()
      expect(cleared.personalCoffeeRating).toBeUndefined()
      expect(cleared.intendedBrewMethod).toBeUndefined()
      expect(cleared.originalRoasterGrindDescription).toBeUndefined()
      expect(cleared.remainingWeightGrams).toBe(150)
      expect(cleared.remainingWeightAdjustmentId).toBe(
        updated.remainingWeightAdjustmentId,
      )
      expect(cleared.isFinished).toBe(true)

      for (const invalidUpdates of [
        { productId: null },
        { purchasePriceToman: null },
        { packageWeightGrams: null },
        { purchaseDate: null },
        { isFinished: null },
        { preGround: null },
      ]) {
        expect(
          MyCoffeeDetailsUpdateSchema.safeParse(invalidUpdates).success,
        ).toBe(false)
      }
    } finally {
      await database.delete()
    }
  })

  it('keeps finished state independent from remaining weight', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const { product } = await seedProduct(database)
      const created = await createMyCoffee(database, {
        id: UUIDSchema.parse('10000000-0000-4000-8000-000000000001'),
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        productId: product.id,
        purchasePriceToman: 0,
        packageWeightGrams: 10,
        purchaseDate: '2025-01-01',
      })
      await createBrew(
        database,
        brewFixture(created.id, 1, 10, '2025-01-02T00:00:00.000Z'),
      )

      const emptyButUnfinished = await getMyCoffee(database, created.id)
      expect(emptyButUnfinished.remainingWeightGrams).toBe(0)
      expect(emptyButUnfinished.isFinished).toBe(false)

      const finished = await markMyCoffeeFinished(database, created.id, true)
      expect(finished.remainingWeightGrams).toBe(0)
      expect(finished.isFinished).toBe(true)
      const reopened = await markMyCoffeeFinished(database, created.id, false)
      expect(reopened.remainingWeightGrams).toBe(0)
      expect(reopened.isFinished).toBe(false)
    } finally {
      await database.delete()
    }
  })

  it('cascades bag deletion atomically without deleting catalog records', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const seeded = await seedProduct(database)
      const bag = await createMyCoffee(database, {
        id: UUIDSchema.parse('10000000-0000-4000-8000-000000000001'),
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        productId: seeded.product.id,
        purchasePriceToman: 850_000,
        packageWeightGrams: 250,
        purchaseDate: '2025-01-01',
      })
      await createBrew(database, brewFixture(bag.id, 1))
      await recordWeightAdjustment(database, weightAdjustment(bag.id))

      await deleteMyCoffee(database, bag.id)
      expect(await database.myCoffees.get(bag.id)).toBeUndefined()
      await expect(getMyCoffee(database, bag.id)).rejects.toBeInstanceOf(
        MissingRecordError,
      )
      expect(
        await database.brewRecords.where('myCoffeeId').equals(bag.id).count(),
      ).toBe(0)
      expect(
        await database.weightAdjustments
          .where('myCoffeeId')
          .equals(bag.id)
          .count(),
      ).toBe(0)
      expect(await database.products.get(seeded.product.id)).toEqual(
        seeded.product,
      )
      expect(await database.coffeeSources.get(seeded.source.id)).toEqual(
        seeded.source,
      )
      expect(await database.roasteries.get(seeded.roastery.id)).toEqual(
        seeded.roastery,
      )

      await expect(
        deleteMyCoffee(
          database,
          UUIDSchema.parse('10000000-0000-4000-8000-000000000099'),
        ),
      ).rejects.toBeInstanceOf(MissingRecordError)
    } finally {
      await database.delete()
    }
  })

  it('rolls back the complete cascade if deleting a child fails', async () => {
    const database = testDatabase()
    let hookAttached = false
    const rejectAdjustmentDelete = () => {
      throw new Error('forced adjustment deletion failure')
    }
    try {
      await database.open()
      const { product } = await seedProduct(database)
      const bag = await createMyCoffee(database, {
        id: UUIDSchema.parse('10000000-0000-4000-8000-000000000001'),
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        productId: product.id,
        purchasePriceToman: 850_000,
        packageWeightGrams: 250,
        purchaseDate: '2025-01-01',
      })
      const brew = await createBrew(database, brewFixture(bag.id, 1))
      const adjustment = weightAdjustment(bag.id)
      await recordWeightAdjustment(database, adjustment)
      database.weightAdjustments.hook(
        'deleting',
        rejectAdjustmentDelete,
      )
      hookAttached = true

      await expect(deleteMyCoffee(database, bag.id)).rejects.toThrow(
        'forced adjustment deletion failure',
      )
      expect(await database.myCoffees.get(bag.id)).toBeDefined()
      expect(await database.brewRecords.get(brew.id)).toBeDefined()
      expect(await database.weightAdjustments.get(adjustment.id)).toBeDefined()
    } finally {
      if (hookAttached) {
        database.weightAdjustments
          .hook('deleting')
          .unsubscribe(rejectAdjustmentDelete)
      }
      await database.delete()
    }
  })
})
