import type { Table, Transaction } from 'dexie'
import type {
  CoffeeVarietyReference,
  FlavorDescriptorReference,
  FlavorFamilyReference,
  OriginReference,
  ProcessingMethodReference,
  RoasteryReference,
} from '@/domain/reference-data'
import type { UUID } from '@/domain/shared'
import type { BrewlogDatabase } from '@/lib/db'
import {
  seedFlavorDescriptors,
  seedFlavorFamilies,
  seedOrigins,
  seedProcessingMethods,
  seedVarieties,
} from './seed-data'
import { createOriginNormalizedKey, normalizeReferenceName } from './utils'

interface ReferenceTables {
  referenceRoasteries: Table<RoasteryReference, UUID>
  originReferences: Table<OriginReference, UUID>
  coffeeVarieties: Table<CoffeeVarietyReference, UUID>
  processingMethods: Table<ProcessingMethodReference, UUID>
  flavorFamilies: Table<FlavorFamilyReference, UUID>
  flavorDescriptors: Table<FlavorDescriptorReference, UUID>
}

async function addByNormalizedName(
  table: Table<RoasteryReference, UUID>,
  record: RoasteryReference,
): Promise<void> {
  const existing = await table
    .where('normalizedName')
    .equals(record.normalizedName)
    .first()
  if (!existing) await table.add(record)
}

async function addByOriginKey(
  table: Table<OriginReference, UUID>,
  record: OriginReference,
): Promise<void> {
  const existing = await table
    .where('normalizedKey')
    .equals(record.normalizedKey)
    .first()
  if (!existing) await table.add(record)
}

async function addByFlavorKey(
  table: Table<FlavorDescriptorReference, UUID>,
  record: FlavorDescriptorReference,
): Promise<void> {
  const existing = await table
    .where('[familyId+normalizedName]')
    .equals([record.familyId, record.normalizedName])
    .first()
  if (!existing) await table.add(record)
}

export async function seedReferenceDataIntoTables(
  tables: ReferenceTables,
): Promise<void> {
  const createdAt = new Date()
  for (const origin of seedOrigins) {
    const normalizedName = normalizeReferenceName(origin.name)
    await addByOriginKey(tables.originReferences, {
      ...origin,
      normalizedName,
      normalizedKey: createOriginNormalizedKey(
        'country',
        normalizedName,
        undefined,
      ),
      kind: 'country',
      source: 'system',
      createdAt,
    })
  }

  for (const variety of seedVarieties) {
    const record: CoffeeVarietyReference = {
      ...variety,
      normalizedName: normalizeReferenceName(variety.name),
      source: 'system',
      createdAt,
    }
    await addByNormalizedName(tables.coffeeVarieties, record)
  }

  for (const process of seedProcessingMethods) {
    const record: ProcessingMethodReference = {
      ...process,
      normalizedName: normalizeReferenceName(process.name),
      source: 'system',
      createdAt,
    }
    await addByNormalizedName(tables.processingMethods, record)
  }

  for (const family of seedFlavorFamilies) {
    const record: FlavorFamilyReference = {
      ...family,
      normalizedName: normalizeReferenceName(family.name),
      source: 'system',
      createdAt,
    }
    await addByNormalizedName(tables.flavorFamilies, record)
  }

  for (const flavor of seedFlavorDescriptors) {
    await addByFlavorKey(tables.flavorDescriptors, {
      ...flavor,
      normalizedName: normalizeReferenceName(flavor.name),
      source: 'system',
      createdAt,
    })
  }
}

export async function seedReferenceDataInUpgrade(
  transaction: Transaction,
): Promise<void> {
  await seedReferenceDataIntoTables({
    referenceRoasteries: transaction.table('referenceRoasteries'),
    originReferences: transaction.table('originReferences'),
    coffeeVarieties: transaction.table('coffeeVarieties'),
    processingMethods: transaction.table('processingMethods'),
    flavorFamilies: transaction.table('flavorFamilies'),
    flavorDescriptors: transaction.table('flavorDescriptors'),
  })
}

export async function initializeReferenceData(
  database: BrewlogDatabase,
): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.referenceRoasteries,
      database.originReferences,
      database.coffeeVarieties,
      database.processingMethods,
      database.flavorFamilies,
      database.flavorDescriptors,
    ],
    async () => {
      await seedReferenceDataIntoTables(database)
    },
  )
}
