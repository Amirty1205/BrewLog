import {
  MyCoffeeDetailsUpdateSchema,
  MyCoffeePurchaseSchema,
  MyCoffeeSchema,
} from '@/domain/coffee'
import type {
  MyCoffee,
  MyCoffeeDetailsUpdateInput,
  MyCoffeePurchaseInput,
} from '@/domain/coffee'
import type { UUID } from '@/domain/shared'
import {
  DuplicateRecordError,
  InvalidReferenceError,
  MissingRecordError,
} from '../domain-errors'
import type { BrewlogDatabase } from '../db'
import { recalculateMyCoffeeWeight } from './weight-state'
import { parseRepositoryId } from './validation'

export type MyCoffeeDetailsUpdate = MyCoffeeDetailsUpdateInput

export async function createMyCoffee(
  database: BrewlogDatabase,
  input: MyCoffeePurchaseInput,
): Promise<MyCoffee> {
  const purchase = MyCoffeePurchaseSchema.parse(input)
  return database.transaction(
    'rw',
    database.products,
    database.myCoffees,
    async () => {
      if (!(await database.products.get(purchase.productId))) {
        throw new InvalidReferenceError('product', purchase.productId)
      }
      if (await database.myCoffees.get(purchase.id)) {
        throw new DuplicateRecordError('MyCoffee', purchase.id)
      }
      const myCoffee = MyCoffeeSchema.parse({
        ...purchase,
        remainingWeightGrams: purchase.packageWeightGrams,
        remainingWeightStatus: 'estimated',
      })
      await database.myCoffees.add(myCoffee)
      return myCoffee
    },
  )
}

export async function updateMyCoffee(
  database: BrewlogDatabase,
  id: UUID,
  updates: MyCoffeeDetailsUpdate,
): Promise<MyCoffee> {
  id = parseRepositoryId(id)
  const parsedUpdates = MyCoffeeDetailsUpdateSchema.parse(updates)
  return database.transaction(
    'rw',
    database.myCoffees,
    database.products,
    database.brewRecords,
    database.weightAdjustments,
    async () => {
      const current = await database.myCoffees.get(id)
      if (!current) {
        throw new MissingRecordError('MyCoffee', id)
      }
      const candidate = MyCoffeeSchema.parse({
        ...current,
        ...parsedUpdates,
        updatedAt: new Date().toISOString(),
      })
      if (!(await database.products.get(candidate.productId))) {
        throw new InvalidReferenceError('product', candidate.productId)
      }
      return recalculateMyCoffeeWeight(database, candidate)
    },
  )
}

export async function markMyCoffeeFinished(
  database: BrewlogDatabase,
  id: UUID,
  isFinished: boolean,
): Promise<MyCoffee> {
  return updateMyCoffee(database, id, { isFinished })
}

export async function getMyCoffee(
  database: BrewlogDatabase,
  id: UUID,
): Promise<MyCoffee> {
  id = parseRepositoryId(id)
  const myCoffee = await database.myCoffees.get(id)
  if (!myCoffee) {
    throw new MissingRecordError('MyCoffee', id)
  }
  return MyCoffeeSchema.parse(myCoffee)
}

export async function listMyCoffees(
  database: BrewlogDatabase,
): Promise<MyCoffee[]> {
  const records = await database.myCoffees.toArray()
  return records.map((record) => MyCoffeeSchema.parse(record))
}

export async function deleteMyCoffee(
  database: BrewlogDatabase,
  id: UUID,
): Promise<void> {
  id = parseRepositoryId(id)
  await database.transaction(
    'rw',
    database.myCoffees,
    database.brewRecords,
    database.weightAdjustments,
    async () => {
      if (!(await database.myCoffees.get(id))) {
        throw new MissingRecordError('MyCoffee', id)
      }
      await database.brewRecords.where('myCoffeeId').equals(id).delete()
      await database.weightAdjustments
        .where('myCoffeeId')
        .equals(id)
        .delete()
      await database.myCoffees.delete(id)
    },
  )
}
