import { describe, expect, it } from 'vitest'
import { UUIDSchema } from '@/domain/shared'
import { BrewlogDatabase } from '../db'
import { MissingRecordError } from '../domain-errors'
import { recordWeightAdjustment } from '../weight-adjustments'
import { createMyCoffee, getMyCoffee } from './my-coffees'
import {
  getWeightAdjustment,
  listWeightAdjustmentsForMyCoffee,
} from './weight-adjustments'
import {
  seedProduct,
  weightAdjustment,
} from '@/test/repository-fixtures'

function testDatabase() {
  return new BrewlogDatabase(`Brewlog-adjustments-${crypto.randomUUID()}`)
}

describe('WeightAdjustment repository', () => {
  it('records checkpoints atomically and retrieves the adjustment history', async () => {
    const database = testDatabase()
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
      const earlier = weightAdjustment(
        bag.id,
        1,
        200,
        '2025-01-03T00:00:00.000Z',
      )
      const later = weightAdjustment(
        bag.id,
        2,
        175,
        '2025-01-03T00:00:00.100Z',
      )
      await recordWeightAdjustment(database, later)
      await recordWeightAdjustment(database, earlier)

      expect(await getWeightAdjustment(database, later.id)).toEqual(later)
      expect(await listWeightAdjustmentsForMyCoffee(database, bag.id)).toEqual([
        earlier,
        later,
      ])
      const current = await getMyCoffee(database, bag.id)
      expect(current.remainingWeightGrams).toBe(175)
      expect(current.remainingWeightStatus).toBe('manually-corrected')
      expect(current.remainingWeightAdjustmentId).toBe(later.id)
    } finally {
      await database.delete()
    }
  })

  it('reports missing adjustment and bag records', async () => {
    const database = testDatabase()
    try {
      await database.open()
      await expect(
        getWeightAdjustment(
          database,
          UUIDSchema.parse('70000000-0000-4000-8000-000000000099'),
        ),
      ).rejects.toBeInstanceOf(MissingRecordError)
      await expect(
        listWeightAdjustmentsForMyCoffee(
          database,
          UUIDSchema.parse('10000000-0000-4000-8000-000000000099'),
        ),
      ).rejects.toBeInstanceOf(MissingRecordError)
    } finally {
      await database.delete()
    }
  })
})
