import { calculateRemainingWeight } from '@/domain/weight'
import { MyCoffeeSchema } from '@/domain/coffee'
import type { MyCoffee } from '@/domain/coffee'
import type { BrewlogDatabase } from '../db'

export async function recalculateMyCoffeeWeight(
  database: BrewlogDatabase,
  myCoffee: MyCoffee,
): Promise<MyCoffee> {
  const [brews, adjustments] = await Promise.all([
    database.brewRecords.where('myCoffeeId').equals(myCoffee.id).toArray(),
    database.weightAdjustments
      .where('myCoffeeId')
      .equals(myCoffee.id)
      .toArray(),
  ])
  const weight = calculateRemainingWeight({
    myCoffeeId: myCoffee.id,
    packageWeightGrams: myCoffee.packageWeightGrams,
    brews,
    adjustments,
  })
  const updatedMyCoffee = MyCoffeeSchema.parse({
    ...myCoffee,
    ...weight,
    updatedAt: new Date().toISOString(),
  })
  await database.myCoffees.put(updatedMyCoffee)
  return updatedMyCoffee
}
