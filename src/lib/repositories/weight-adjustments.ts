import { WeightAdjustmentSchema } from '@/domain/brew'
import type { WeightAdjustment } from '@/domain/brew'
import { compareUtcTimestamps } from '@/domain/weight'
import type { UUID } from '@/domain/shared'
import { MissingRecordError } from '../domain-errors'
import type { BrewlogDatabase } from '../db'
import { parseRepositoryId } from './validation'

export async function getWeightAdjustment(
  database: BrewlogDatabase,
  id: UUID,
): Promise<WeightAdjustment> {
  id = parseRepositoryId(id)
  const adjustment = await database.weightAdjustments.get(id)
  if (!adjustment) {
    throw new MissingRecordError('WeightAdjustment', id)
  }
  return WeightAdjustmentSchema.parse(adjustment)
}

export async function listWeightAdjustmentsForMyCoffee(
  database: BrewlogDatabase,
  myCoffeeId: UUID,
): Promise<WeightAdjustment[]> {
  myCoffeeId = parseRepositoryId(myCoffeeId)
  return database.transaction(
    'r',
    database.myCoffees,
    database.weightAdjustments,
    async () => {
      if (!(await database.myCoffees.get(myCoffeeId))) {
        throw new MissingRecordError('MyCoffee', myCoffeeId)
      }
      const records = await database.weightAdjustments
        .where('myCoffeeId')
        .equals(myCoffeeId)
        .toArray()
      return records
        .map((record) => WeightAdjustmentSchema.parse(record))
        .sort((left, right) => {
          const timeOrder = compareUtcTimestamps(
            left.measuredAt,
            right.measuredAt,
          )
          if (timeOrder !== 0) return timeOrder
          if (left.id === right.id) {
            return 0
          }
          return left.id < right.id ? -1 : 1
        })
    },
  )
}
