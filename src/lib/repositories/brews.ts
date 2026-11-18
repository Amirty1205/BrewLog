import { BrewSchema, BrewUpdateSchema } from '@/domain/brew'
import type { Brew, BrewInput, BrewUpdateInput } from '@/domain/brew'
import type { UUID } from '@/domain/shared'
import {
  DuplicateRecordError,
  InvalidReferenceError,
  MissingRecordError,
} from '../domain-errors'
import type { BrewlogDatabase } from '../db'
import { recalculateMyCoffeeWeight } from './weight-state'
import { parseRepositoryId } from './validation'

export async function createBrew(
  database: BrewlogDatabase,
  input: BrewInput,
): Promise<Brew> {
  const brew = BrewSchema.parse(input)
  return database.transaction(
    'rw',
    database.brewRecords,
    database.myCoffees,
    database.weightAdjustments,
    async () => {
      const myCoffee = await database.myCoffees.get(brew.myCoffeeId)
      if (!myCoffee) {
        throw new InvalidReferenceError('MyCoffee', brew.myCoffeeId)
      }
      if (await database.brewRecords.get(brew.id)) {
        throw new DuplicateRecordError('Brew', brew.id)
      }
      await database.brewRecords.add(brew)
      await recalculateMyCoffeeWeight(database, myCoffee)
      return brew
    },
  )
}

export async function updateBrew(
  database: BrewlogDatabase,
  id: UUID,
  updates: BrewUpdateInput,
): Promise<Brew> {
  id = parseRepositoryId(id)
  const parsedUpdates = BrewUpdateSchema.parse(updates)

  return database.transaction(
    'rw',
    database.brewRecords,
    database.myCoffees,
    database.weightAdjustments,
    async () => {
      const current = await database.brewRecords.get(id)
      if (!current) {
        throw new MissingRecordError('Brew', id)
      }
      const oldMyCoffee = await database.myCoffees.get(current.myCoffeeId)
      if (!oldMyCoffee) {
        throw new InvalidReferenceError('MyCoffee', current.myCoffeeId)
      }
      const newMyCoffeeId = parsedUpdates.myCoffeeId ?? current.myCoffeeId
      const newMyCoffee = await database.myCoffees.get(newMyCoffeeId)
      if (!newMyCoffee) {
        throw new InvalidReferenceError('MyCoffee', newMyCoffeeId)
      }

      const brew = BrewSchema.parse({
        ...current,
        ...parsedUpdates,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      })
      await database.brewRecords.put(brew)

      await recalculateMyCoffeeWeight(database, oldMyCoffee)
      if (newMyCoffee.id !== oldMyCoffee.id) {
        await recalculateMyCoffeeWeight(database, newMyCoffee)
      }
      return brew
    },
  )
}

export async function deleteBrew(
  database: BrewlogDatabase,
  id: UUID,
): Promise<void> {
  id = parseRepositoryId(id)
  await database.transaction(
    'rw',
    database.brewRecords,
    database.myCoffees,
    database.weightAdjustments,
    async () => {
      const brew = await database.brewRecords.get(id)
      if (!brew) {
        throw new MissingRecordError('Brew', id)
      }
      const myCoffee = await database.myCoffees.get(brew.myCoffeeId)
      if (!myCoffee) {
        throw new InvalidReferenceError('MyCoffee', brew.myCoffeeId)
      }
      await database.brewRecords.delete(id)
      await recalculateMyCoffeeWeight(database, myCoffee)
    },
  )
}

export async function getBrew(
  database: BrewlogDatabase,
  id: UUID,
): Promise<Brew> {
  id = parseRepositoryId(id)
  const brew = await database.brewRecords.get(id)
  if (!brew) {
    throw new MissingRecordError('Brew', id)
  }
  return BrewSchema.parse(brew)
}

export async function listBrewsForMyCoffee(
  database: BrewlogDatabase,
  myCoffeeId: UUID,
): Promise<Brew[]> {
  myCoffeeId = parseRepositoryId(myCoffeeId)
  return database.transaction(
    'r',
    database.myCoffees,
    database.brewRecords,
    async () => {
      if (!(await database.myCoffees.get(myCoffeeId))) {
        throw new MissingRecordError('MyCoffee', myCoffeeId)
      }
      const records = await database.brewRecords
        .where('myCoffeeId')
        .equals(myCoffeeId)
        .toArray()
      return records.map((record) => BrewSchema.parse(record))
    },
  )
}
