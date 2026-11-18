import { RoasterySchema } from '@/domain/coffee'
import type { RoasteryInput } from '@/domain/coffee'
import type { UUID } from '@/domain/shared'
import {
  DuplicateRecordError,
  InvalidReferenceError,
  InvalidOperationError,
  MissingRecordError,
  ReferencedRecordError,
} from '../domain-errors'
import type { BrewlogDatabase } from '../db'
import { parseRepositoryId } from './validation'

async function validateLogoReference(
  database: BrewlogDatabase,
  logoImageId: UUID | undefined,
): Promise<void> {
  if (logoImageId && !(await database.imageAssets.get(logoImageId))) {
    throw new InvalidReferenceError('image asset', logoImageId)
  }
}

export async function createRoastery(
  database: BrewlogDatabase,
  input: RoasteryInput,
) {
  const roastery = RoasterySchema.parse(input)
  return database.transaction(
    'rw',
    database.roasteries,
    database.imageAssets,
    async () => {
      if (await database.roasteries.get(roastery.id)) {
        throw new DuplicateRecordError('Roastery', roastery.id)
      }
      await validateLogoReference(database, roastery.logoImageId)
      await database.roasteries.add(roastery)
      return roastery
    },
  )
}

export async function updateRoastery(
  database: BrewlogDatabase,
  id: UUID,
  input: RoasteryInput,
) {
  id = parseRepositoryId(id)
  const candidate = RoasterySchema.parse(input)
  if (candidate.id !== id) {
    throw new InvalidOperationError(
      'Roastery update ID does not match the record ID.',
    )
  }

  return database.transaction(
    'rw',
    database.roasteries,
    database.imageAssets,
    async () => {
      const current = await database.roasteries.get(id)
      if (!current) {
        throw new MissingRecordError('Roastery', id)
      }
      await validateLogoReference(database, candidate.logoImageId)
      const roastery = RoasterySchema.parse({
        ...candidate,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      })
      await database.roasteries.put(roastery)
      return roastery
    },
  )
}

export async function getRoastery(database: BrewlogDatabase, id: UUID) {
  id = parseRepositoryId(id)
  const storedRoastery = await database.roasteries.get(id)
  if (!storedRoastery) {
    throw new MissingRecordError('Roastery', id)
  }
  return RoasterySchema.parse(storedRoastery)
}

export async function listRoasteries(database: BrewlogDatabase) {
  const records = await database.roasteries.toArray()
  return records.map((record) => RoasterySchema.parse(record))
}

export async function deleteRoastery(
  database: BrewlogDatabase,
  id: UUID,
): Promise<void> {
  id = parseRepositoryId(id)
  await database.transaction(
    'rw',
    database.roasteries,
    database.products,
    async () => {
      if (!(await database.roasteries.get(id))) {
        throw new MissingRecordError('Roastery', id)
      }
      const references = await database.products
        .where('roasteryId')
        .equals(id)
        .count()
      if (references > 0) {
        throw new ReferencedRecordError('Roastery', id, 'Product')
      }
      await database.roasteries.delete(id)
    },
  )
}
