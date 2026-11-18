import type { Table } from 'dexie'
import {
  CoffeeVarietyReferenceSchema,
  FlavorDescriptorReferenceSchema,
  FlavorFamilyReferenceSchema,
  OriginReferenceSchema,
  RoasteryReferenceSchema,
  ProcessingMethodReferenceSchema,
} from '@/domain/reference-data'
import type {
  CustomReferenceCategory,
  FlavorDescriptorReference,
  OriginReference,
  OriginKind,
  ReferenceDataSnapshot,
  ReferenceEntry,
} from '@/domain/reference-data'
import { createUUID } from '@/domain/shared'
import type { UUID } from '@/domain/shared'
import {
  InvalidOperationError,
  InvalidReferenceError,
} from '@/lib/domain-errors'
import type { BrewlogDatabase } from '@/lib/db'
import { normalizeReferenceName, createOriginNormalizedKey } from '../reference-data/utils'
import { initializeReferenceData } from '../reference-data/seed'

export { initializeReferenceData }

function assertName(name: string): string {
  const parsed = RoasteryReferenceSchema.shape.name.parse(name)
  return parsed
}

function createdAt(): Date {
  return new Date()
}

async function findNamed<T extends { normalizedName: string }>(
  table: Table<T, UUID>,
  normalizedName: string,
): Promise<T | undefined> {
  return table.where('normalizedName').equals(normalizedName).first()
}

async function createNamedCustomReference<T extends ReferenceEntry>(
  table: Table<T, UUID>,
  name: string,
  makeEntry: (
    name: string,
    normalizedName: string,
    timestamp: Date,
  ) => T,
): Promise<T> {
  const normalizedName = normalizeReferenceName(name)
  const existing = await findNamed(table, normalizedName)
  if (existing) return existing
  const entry = makeEntry(name, normalizedName, createdAt())
  await table.add(entry)
  return entry
}

export async function listReferenceData(
  database: BrewlogDatabase,
): Promise<ReferenceDataSnapshot> {
  const [
    roasteries,
    origins,
    varieties,
    processingMethods,
    flavorFamilies,
    flavorDescriptors,
  ] = await Promise.all([
    database.referenceRoasteries.toArray(),
    database.originReferences.toArray(),
    database.coffeeVarieties.toArray(),
    database.processingMethods.toArray(),
    database.flavorFamilies.toArray(),
    database.flavorDescriptors.toArray(),
  ])
  return {
    roasteries: roasteries.map((entry) =>
      RoasteryReferenceSchema.parse(entry),
    ),
    origins: origins.map((entry) => OriginReferenceSchema.parse(entry)),
    varieties: varieties.map((entry) =>
      CoffeeVarietyReferenceSchema.parse(entry),
    ),
    processingMethods: processingMethods.map((entry) =>
      ProcessingMethodReferenceSchema.parse(entry),
    ),
    flavorFamilies: flavorFamilies.map((entry) =>
      FlavorFamilyReferenceSchema.parse(entry),
    ),
    flavorDescriptors: flavorDescriptors.map((entry) =>
      FlavorDescriptorReferenceSchema.parse(entry),
    ),
  }
}

export async function listOriginsByKind(
  database: BrewlogDatabase,
  kind: OriginKind,
) {
  const records = await database.originReferences
    .where('kind')
    .equals(kind)
    .toArray()
  return records.map((record) => OriginReferenceSchema.parse(record))
}

export async function listOriginChildren(
  database: BrewlogDatabase,
  kind: Exclude<OriginKind, 'country'>,
  parentId: UUID,
) {
  const records = await database.originReferences
    .where('[kind+parentId]')
    .equals([kind, parentId])
    .toArray()
  return records.map((record) => OriginReferenceSchema.parse(record))
}

export async function createCustomReference(
  database: BrewlogDatabase,
  category: CustomReferenceCategory,
  name: string,
  parentId?: UUID,
): Promise<ReferenceEntry> {
  const cleanName = assertName(name)
  const normalizedName = normalizeReferenceName(cleanName)

  if (category === 'roastery') {
    return database.transaction('rw', database.referenceRoasteries, async () =>
      createNamedCustomReference(
        database.referenceRoasteries,
        cleanName,
        (value, normalized, timestamp) =>
          RoasteryReferenceSchema.parse({
            id: createUUID(),
            name: value,
            normalizedName: normalized,
            source: 'custom',
            createdAt: timestamp,
          }),
      ),
    )
  }

  if (
    category === 'country' ||
    category === 'region' ||
    category === 'farm'
  ) {
    return database.transaction(
      'rw',
      database.originReferences,
      async () => {
        if (category === 'country' && parentId) {
          throw new InvalidOperationError(
            'A country cannot have a parent origin.',
          )
        }
        let parent: OriginReference | undefined
        if (category !== 'country') {
          if (!parentId) {
            throw new InvalidOperationError(
              'A region or farm must be attached to a parent origin.',
            )
          }
          parent = await database.originReferences.get(parentId)
          if (!parent) {
            throw new InvalidReferenceError('origin', parentId)
          }
          if (
            (category === 'region' && parent.kind !== 'country') ||
            (category === 'farm' &&
              parent.kind !== 'country' &&
              parent.kind !== 'region')
          ) {
            throw new InvalidOperationError(
              'The selected parent is not valid for this origin level.',
            )
          }
        }
        const normalizedKey = createOriginNormalizedKey(
          category,
          normalizedName,
          parentId,
        )
        const existing = await database.originReferences
          .where('normalizedKey')
          .equals(normalizedKey)
          .first()
        if (existing) return OriginReferenceSchema.parse(existing)

        const entry = OriginReferenceSchema.parse({
          id: createUUID(),
          name: cleanName,
          normalizedName,
          normalizedKey,
          kind: category,
          ...(parentId ? { parentId } : {}),
          source: 'custom',
          createdAt: createdAt(),
        })
        await database.originReferences.add(entry)
        return entry
      },
    )
  }

  if (category === 'variety') {
    return database.transaction('rw', database.coffeeVarieties, async () =>
      createNamedCustomReference(
        database.coffeeVarieties,
        cleanName,
        (value, normalized, timestamp) =>
          CoffeeVarietyReferenceSchema.parse({
            id: createUUID(),
            name: value,
            normalizedName: normalized,
            source: 'custom',
            createdAt: timestamp,
          }),
      ),
    )
  }

  if (category === 'process') {
    return database.transaction('rw', database.processingMethods, async () =>
      createNamedCustomReference(
        database.processingMethods,
        cleanName,
        (value, normalized, timestamp) =>
          ProcessingMethodReferenceSchema.parse({
            id: createUUID(),
            name: value,
            normalizedName: normalized,
            source: 'custom',
            createdAt: timestamp,
          }),
      ),
    )
  }

  if (category === 'flavor-family') {
    return database.transaction('rw', database.flavorFamilies, async () =>
      createNamedCustomReference(
        database.flavorFamilies,
        cleanName,
        (value, normalized, timestamp) =>
          FlavorFamilyReferenceSchema.parse({
            id: createUUID(),
            name: value,
            normalizedName: normalized,
            source: 'custom',
            createdAt: timestamp,
          }),
      ),
    )
  }

  if (!parentId) {
    throw new InvalidOperationError(
      'A flavor descriptor must belong to a flavor family.',
    )
  }
  return database.transaction(
    'rw',
    database.flavorFamilies,
    database.flavorDescriptors,
    async () => {
      if (!(await database.flavorFamilies.get(parentId))) {
        throw new InvalidReferenceError('flavor family', parentId)
      }
      const existing = await database.flavorDescriptors
        .where('[familyId+normalizedName]')
        .equals([parentId, normalizedName])
        .first()
      if (existing) {
        return FlavorDescriptorReferenceSchema.parse(existing)
      }
      const descriptor: FlavorDescriptorReference = {
        id: createUUID(),
        familyId: parentId,
        name: cleanName,
        normalizedName,
        source: 'custom',
        createdAt: createdAt(),
      }
      await database.flavorDescriptors.add(descriptor)
      return descriptor
    },
  )
}
