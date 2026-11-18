import { CoffeeSourceSchema } from '@/domain/coffee'
import type { CoffeeSourceInput } from '@/domain/coffee'
import type { UUID } from '@/domain/shared'
import {
  DuplicateRecordError,
  InvalidOperationError,
  MissingRecordError,
  ReferencedRecordError,
} from '../domain-errors'
import type { BrewlogDatabase } from '../db'
import { parseRepositoryId } from './validation'

export async function createCoffeeSource(
  database: BrewlogDatabase,
  input: CoffeeSourceInput,
) {
  const coffeeSource = CoffeeSourceSchema.parse(input)
  return database.transaction('rw', database.coffeeSources, async () => {
    if (await database.coffeeSources.get(coffeeSource.id)) {
      throw new DuplicateRecordError('CoffeeSource', coffeeSource.id)
    }
    await database.coffeeSources.add(coffeeSource)
    return coffeeSource
  })
}

export async function updateCoffeeSource(
  database: BrewlogDatabase,
  id: UUID,
  input: CoffeeSourceInput,
) {
  id = parseRepositoryId(id)
  const candidate = CoffeeSourceSchema.parse(input)
  if (candidate.id !== id) {
    throw new InvalidOperationError(
      'CoffeeSource update ID does not match the record ID.',
    )
  }

  return database.transaction('rw', database.coffeeSources, async () => {
    const current = await database.coffeeSources.get(id)
    if (!current) {
      throw new MissingRecordError('CoffeeSource', id)
    }
    const coffeeSource = CoffeeSourceSchema.parse({
      ...candidate,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    })
    await database.coffeeSources.put(coffeeSource)
    return coffeeSource
  })
}

export async function getCoffeeSource(
  database: BrewlogDatabase,
  id: UUID,
) {
  id = parseRepositoryId(id)
  const storedCoffeeSource = await database.coffeeSources.get(id)
  if (!storedCoffeeSource) {
    throw new MissingRecordError('CoffeeSource', id)
  }
  return CoffeeSourceSchema.parse(storedCoffeeSource)
}

export async function listCoffeeSources(database: BrewlogDatabase) {
  const records = await database.coffeeSources.toArray()
  return records.map((record) => CoffeeSourceSchema.parse(record))
}

export async function deleteCoffeeSource(
  database: BrewlogDatabase,
  id: UUID,
): Promise<void> {
  id = parseRepositoryId(id)
  await database.transaction(
    'rw',
    database.coffeeSources,
    database.productSources,
    async () => {
      const coffeeSource = await database.coffeeSources.get(id)
      if (!coffeeSource) {
        throw new MissingRecordError('CoffeeSource', id)
      }
      const references = await database.productSources
        .where('coffeeSourceId')
        .equals(id)
        .count()
      if (references > 0) {
        throw new ReferencedRecordError('CoffeeSource', id, 'ProductSource')
      }
      await database.coffeeSources.delete(id)
    },
  )
}
