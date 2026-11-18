import type { Table, Transaction } from 'dexie'
import type {
  CoffeeVarietyReference,
  OriginKind,
  OriginReference,
  ProcessingMethodReference,
  RoasteryReference,
} from '@/domain/reference-data'
import type { UUID } from '@/domain/shared'
import { createUUID } from '@/domain/shared'
import { CoffeeSchema } from '@/domain/coffee-records'
import type { LegacyCoffeeCatalogRecord } from '@/types/database'
import { seedReferenceDataInUpgrade } from './seed'
import { createOriginNormalizedKey, normalizeReferenceName } from './utils'

async function ensureNamedReference(
  table: Table<RoasteryReference, UUID>,
  name: string,
  createdAt: Date,
): Promise<UUID> {
  const normalizedName = normalizeReferenceName(name)
  const existing = await table
    .where('normalizedName')
    .equals(normalizedName)
    .first()
  if (existing) return existing.id

  const entry: RoasteryReference = {
    id: createUUID(),
    name: name.trim(),
    normalizedName,
    source: 'custom',
    createdAt,
  }
  await table.add(entry)
  return entry.id
}

async function ensureOriginReference(
  table: Table<OriginReference, UUID>,
  kind: OriginKind,
  name: string,
  parentId: UUID | undefined,
  createdAt: Date,
): Promise<UUID> {
  const normalizedName = normalizeReferenceName(name)
  const normalizedKey = createOriginNormalizedKey(
    kind,
    normalizedName,
    parentId,
  )
  const existing = await table
    .where('normalizedKey')
    .equals(normalizedKey)
    .first()
  if (existing) return existing.id

  const entry: OriginReference = {
    id: createUUID(),
    name: name.trim(),
    normalizedName,
    normalizedKey,
    kind,
    ...(parentId ? { parentId } : {}),
    source: 'custom',
    createdAt,
  }
  await table.add(entry)
  return entry.id
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function textList(value: unknown): string[] {
  if (typeof value === 'string') {
    const item = text(value)
    return item ? [item] : []
  }
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function recordDate(value: Date, fallback: Date): Date {
  return value instanceof Date && Number.isFinite(value.getTime())
    ? value
    : fallback
}

export async function migrateCoffeeCatalogToReferences(
  transaction: Transaction,
): Promise<void> {
  await seedReferenceDataInUpgrade(transaction)

  const coffees = transaction.table<LegacyCoffeeCatalogRecord, UUID>(
    'coffeeCatalog',
  )
  const roasteries = transaction.table<RoasteryReference, UUID>(
    'referenceRoasteries',
  )
  const origins = transaction.table<OriginReference, UUID>('originReferences')
  const varieties = transaction.table<CoffeeVarietyReference, UUID>(
    'coffeeVarieties',
  )
  const processes = transaction.table<ProcessingMethodReference, UUID>(
    'processingMethods',
  )
  const records = await coffees.toArray()
  const now = new Date()

  for (const coffee of records) {
    const createdAt = recordDate(coffee.createdAt, now)
    const roasteryName = text(coffee.roastery)
    const originName = text(coffee.origin)
    const regionName = text(coffee.region)
    const farmName = text(coffee.farm)

    const roasteryId = roasteryName
      ? await ensureNamedReference(roasteries, roasteryName, createdAt)
      : undefined
    const originCountryId = originName
      ? await ensureOriginReference(
          origins,
          'country',
          originName,
          undefined,
          createdAt,
        )
      : undefined
    const originRegionId = regionName
      ? await ensureOriginReference(
          origins,
          'region',
          regionName,
          originCountryId,
          createdAt,
        )
      : undefined
    const originFarmId = farmName
      ? await ensureOriginReference(
          origins,
          'farm',
          farmName,
          originRegionId ?? originCountryId,
          createdAt,
        )
      : undefined

    const varietyIds: UUID[] = []
    for (const variety of textList(coffee.variety)) {
      varietyIds.push(await ensureNamedReference(varieties, variety, createdAt))
    }

    const processIds: UUID[] = []
    for (const process of textList(coffee.processes)) {
      processIds.push(await ensureNamedReference(processes, process, createdAt))
    }

    const migratedCoffee = CoffeeSchema.parse({
      id: coffee.id,
      name: coffee.name,
      createdAt,
      updatedAt: recordDate(coffee.updatedAt, now),
      ...(roasteryId ? { roasteryId } : {}),
      ...(originCountryId ? { originCountryId } : {}),
      ...(originRegionId ? { originRegionId } : {}),
      ...(originFarmId ? { originFarmId } : {}),
      varietyIds,
      processIds,
      flavorDescriptorIds: [],
      ...(coffee.altitudeMin === undefined
        ? {}
        : { altitudeMin: coffee.altitudeMin }),
      ...(coffee.altitudeMax === undefined
        ? {}
        : { altitudeMax: coffee.altitudeMax }),
      ...(coffee.roastLevel ? { roastLevel: coffee.roastLevel } : {}),
      ...(coffee.description ? { description: coffee.description } : {}),
    })
    await transaction.table('coffeeCatalog').put(migratedCoffee)
  }
}
