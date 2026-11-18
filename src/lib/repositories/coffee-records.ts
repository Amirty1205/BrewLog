import {
  CoffeeSchema,
  MyCoffeeSchema,
} from '@/domain/coffee-records'
import type {
  Coffee,
  CoffeeInput,
  MyCoffee,
  MyCoffeeInput,
} from '@/domain/coffee-records'
import type { UUID } from '@/domain/shared'
import type { BrewlogDatabase } from '../db'
import {
  DuplicateRecordError,
  InvalidOperationError,
  InvalidReferenceError,
  MissingRecordError,
} from '../domain-errors'
import { parseRepositoryId } from './validation'

const coffeeReferenceTables = (database: BrewlogDatabase) => [
  database.coffeeCatalog,
  database.referenceRoasteries,
  database.originReferences,
  database.coffeeVarieties,
  database.processingMethods,
  database.flavorFamilies,
  database.flavorDescriptors,
]

async function validateCoffeeReferences(
  database: BrewlogDatabase,
  coffee: Coffee,
): Promise<void> {
  if (
    coffee.roasteryId &&
    !(await database.referenceRoasteries.get(coffee.roasteryId))
  ) {
    throw new InvalidReferenceError('roastery', coffee.roasteryId)
  }

  if (coffee.originCountryId) {
    const country = await database.originReferences.get(coffee.originCountryId)
    if (!country || country.kind !== 'country') {
      throw new InvalidReferenceError('country', coffee.originCountryId)
    }
  }
  if (coffee.originRegionId) {
    const region = await database.originReferences.get(coffee.originRegionId)
    if (
      !region ||
      region.kind !== 'region' ||
      region.parentId !== coffee.originCountryId
    ) {
      throw new InvalidReferenceError('region', coffee.originRegionId)
    }
  }
  if (coffee.originFarmId) {
    const farm = await database.originReferences.get(coffee.originFarmId)
    if (
      !farm ||
      farm.kind !== 'farm' ||
      farm.parentId !==
        (coffee.originRegionId ?? coffee.originCountryId)
    ) {
      throw new InvalidReferenceError('farm', coffee.originFarmId)
    }
  }

  const [
    varietyCount,
    processCount,
    flavorDescriptors,
  ] = await Promise.all([
    database.coffeeVarieties.where('id').anyOf(coffee.varietyIds).count(),
    database.processingMethods.where('id').anyOf(coffee.processIds).count(),
    database.flavorDescriptors
      .where('id')
      .anyOf(coffee.flavorDescriptorIds)
      .toArray(),
  ])
  if (varietyCount !== new Set(coffee.varietyIds).size) {
    for (const id of coffee.varietyIds) {
      if (!(await database.coffeeVarieties.get(id))) {
        throw new InvalidReferenceError('variety', id)
      }
    }
    throw new InvalidOperationError('A variety can only be selected once.')
  }
  if (processCount !== new Set(coffee.processIds).size) {
    for (const id of coffee.processIds) {
      if (!(await database.processingMethods.get(id))) {
        throw new InvalidReferenceError('process', id)
      }
    }
    throw new InvalidOperationError('A process can only be selected once.')
  }
  const flavorsById = new Map(
    flavorDescriptors.map((descriptor) => [descriptor.id, descriptor]),
  )
  for (const id of coffee.flavorDescriptorIds) {
    const descriptor = flavorsById.get(id)
    if (!descriptor) throw new InvalidReferenceError('flavor', id)
    if (!(await database.flavorFamilies.get(descriptor.familyId))) {
      throw new InvalidReferenceError(
        'flavor family',
        descriptor.familyId,
      )
    }
  }
}

export async function createCoffee(
  database: BrewlogDatabase,
  input: CoffeeInput,
): Promise<Coffee> {
  const coffee = CoffeeSchema.parse(input)
  return database.transaction('rw', coffeeReferenceTables(database), async () => {
    await validateCoffeeReferences(database, coffee)
    if (await database.coffeeCatalog.get(coffee.id)) {
      throw new DuplicateRecordError('Coffee', coffee.id)
    }
    await database.coffeeCatalog.add(coffee)
    return coffee
  })
}

export async function getCoffee(
  database: BrewlogDatabase,
  id: UUID,
): Promise<Coffee> {
  id = parseRepositoryId(id)
  const coffee = await database.coffeeCatalog.get(id)
  if (!coffee) {
    throw new MissingRecordError('Coffee', id)
  }
  return CoffeeSchema.parse(coffee)
}

export async function listCoffeeCatalog(
  database: BrewlogDatabase,
): Promise<Coffee[]> {
  const records = await database.coffeeCatalog.toArray()
  return records.map((record) => CoffeeSchema.parse(record))
}

export async function updateCoffee(
  database: BrewlogDatabase,
  id: UUID,
  input: CoffeeInput,
): Promise<Coffee> {
  id = parseRepositoryId(id)
  const candidate = CoffeeSchema.parse(input)
  if (candidate.id !== id) {
    throw new InvalidOperationError(
      'Coffee update ID does not match the record ID.',
    )
  }

  return database.transaction('rw', coffeeReferenceTables(database), async () => {
    const current = await database.coffeeCatalog.get(id)
    if (!current) {
      throw new MissingRecordError('Coffee', id)
    }
    const coffee = CoffeeSchema.parse({
      ...candidate,
      createdAt: current.createdAt,
      updatedAt: new Date(),
    })
    await validateCoffeeReferences(database, coffee)
    await database.coffeeCatalog.put(coffee)
    return coffee
  })
}

export async function createMyCoffeeRecord(
  database: BrewlogDatabase,
  input: MyCoffeeInput,
): Promise<MyCoffee> {
  const myCoffee = MyCoffeeSchema.parse(input)
  return database.transaction(
    'rw',
    database.coffeeCatalog,
    database.myCoffeeCollection,
    async () => {
      if (!(await database.coffeeCatalog.get(myCoffee.coffeeId))) {
        throw new InvalidReferenceError('coffee', myCoffee.coffeeId)
      }
      if (await database.myCoffeeCollection.get(myCoffee.id)) {
        throw new DuplicateRecordError('MyCoffee', myCoffee.id)
      }
      await database.myCoffeeCollection.add(myCoffee)
      return myCoffee
    },
  )
}

export async function getMyCoffeeRecord(
  database: BrewlogDatabase,
  id: UUID,
): Promise<MyCoffee> {
  id = parseRepositoryId(id)
  const myCoffee = await database.myCoffeeCollection.get(id)
  if (!myCoffee) {
    throw new MissingRecordError('MyCoffee', id)
  }
  return MyCoffeeSchema.parse(myCoffee)
}

export async function listMyCoffeeCollection(
  database: BrewlogDatabase,
): Promise<MyCoffee[]> {
  const records = await database.myCoffeeCollection.toArray()
  return records.map((record) => MyCoffeeSchema.parse(record))
}

export async function updateMyCoffeeStatus(
  database: BrewlogDatabase,
  id: UUID,
  status: MyCoffee['status'],
): Promise<MyCoffee> {
  id = parseRepositoryId(id)
  const parsedStatus = MyCoffeeSchema.shape.status.parse(status)
  return database.transaction(
    'rw',
    database.myCoffeeCollection,
    async () => {
      const current = await database.myCoffeeCollection.get(id)
      if (!current) {
        throw new MissingRecordError('MyCoffee', id)
      }
      const myCoffee = MyCoffeeSchema.parse({
        ...current,
        status: parsedStatus,
        updatedAt: new Date(),
      })
      await database.myCoffeeCollection.put(myCoffee)
      return myCoffee
    },
  )
}
