import { describe, expect, it } from 'vitest'
import { BrewSchema, WeightAdjustmentSchema } from '@/domain/brew'
import { MyCoffeeSchema } from '@/domain/coffee'
import { UUIDSchema } from '@/domain/shared'
import { recordWeightAdjustment } from './weight-adjustments'
import { BrewlogDatabase } from './db'

const createdAt = '2025-01-01T00:00:00.000Z'
const myCoffeeId = UUIDSchema.parse(
  '10000000-0000-4000-8000-000000000001',
)

function testDatabaseName() {
  return `Brewlog-weight-test-${crypto.randomUUID()}`
}

function bag(packageWeightGrams: number) {
  return MyCoffeeSchema.parse({
    id: myCoffeeId,
    createdAt,
    updatedAt: createdAt,
    productId: UUIDSchema.parse(
      '20000000-0000-4000-8000-000000000001',
    ),
    purchasePriceToman: 0,
    packageWeightGrams,
    purchaseDate: '2025-01-01',
  })
}

function brew() {
  return BrewSchema.parse({
    id: UUIDSchema.parse('60000000-0000-4000-8000-000000000001'),
    myCoffeeId,
    createdAt,
    updatedAt: createdAt,
    brewedAt: '2025-01-02T00:00:00.000Z',
    brewMethod: 'V60',
    coffeeDoseGrams: 10,
    waterAmountGrams: 200,
    temperatureCelsius: 93,
    brewDurationSeconds: 150,
  })
}

function adjustment(measuredRemainingWeightGrams: number) {
  return WeightAdjustmentSchema.parse({
    id: UUIDSchema.parse('70000000-0000-4000-8000-000000000001'),
    myCoffeeId,
    createdAt,
    updatedAt: '2025-01-03T00:00:00.000Z',
    measuredAt: '2025-01-02T00:00:00.000Z',
    measuredRemainingWeightGrams,
  })
}

describe('recordWeightAdjustment', () => {
  it('writes the checkpoint and cached bag weight atomically', async () => {
    const database = new BrewlogDatabase(testDatabaseName())
    try {
      await database.open()
      await database.myCoffees.add(bag(250))
      await database.brewRecords.add(brew())

      const updatedBag = await recordWeightAdjustment(database, adjustment(100))

      expect(updatedBag.remainingWeightGrams).toBe(90)
      expect(updatedBag.remainingWeightStatus).toBe('manually-corrected')
      expect(updatedBag.remainingWeightAdjustmentId).toBe(adjustment(100).id)
      expect(await database.weightAdjustments.count()).toBe(1)
      expect(await database.myCoffees.get(myCoffeeId)).toEqual(updatedBag)
    } finally {
      await database.delete()
    }
  })

  it('rolls back the checkpoint if recalculation finds inconsistent history', async () => {
    const database = new BrewlogDatabase(testDatabaseName())
    try {
      await database.open()
      await database.myCoffees.add(bag(250))
      await database.brewRecords.add(
        BrewSchema.parse({
          ...brew(),
          coffeeDoseGrams: 110,
        }),
      )

      await expect(
        recordWeightAdjustment(database, adjustment(100)),
      ).rejects.toThrow(RangeError)
      expect(await database.weightAdjustments.count()).toBe(0)
      expect(await database.myCoffees.get(myCoffeeId)).toMatchObject({
        remainingWeightGrams: 250,
        remainingWeightStatus: 'estimated',
      })
    } finally {
      await database.delete()
    }
  })
})
