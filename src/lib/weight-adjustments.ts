import { WeightAdjustmentSchema } from '@/domain/brew'
import type { WeightAdjustmentInput } from '@/domain/brew'
import type { BrewlogDatabase } from './db'
import { DuplicateRecordError, MissingRecordError } from './domain-errors'
import { recalculateMyCoffeeWeight } from './repositories/weight-state'
import type { MyCoffee } from '@/domain/coffee'

export async function recordWeightAdjustment(
  database: BrewlogDatabase,
  input: WeightAdjustmentInput,
): Promise<MyCoffee> {
  const adjustment = WeightAdjustmentSchema.parse(input)

  return database.transaction(
    'rw',
    database.myCoffees,
    database.brewRecords,
    database.weightAdjustments,
    async () => {
      if (await database.weightAdjustments.get(adjustment.id)) {
        throw new DuplicateRecordError('WeightAdjustment', adjustment.id)
      }
      const myCoffee = await database.myCoffees.get(adjustment.myCoffeeId)
      if (!myCoffee) {
        throw new MissingRecordError('MyCoffee', adjustment.myCoffeeId)
      }

      await database.weightAdjustments.add(adjustment)
      return recalculateMyCoffeeWeight(database, myCoffee)
    },
  )
}
