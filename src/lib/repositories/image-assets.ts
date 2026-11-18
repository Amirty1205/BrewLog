import { ImageAssetSchema } from '@/domain/image'
import type { ImageAssetInput } from '@/domain/image'
import type { UUID } from '@/domain/shared'
import {
  DuplicateRecordError,
  InvalidOperationError,
  MissingRecordError,
  ReferencedRecordError,
} from '../domain-errors'
import type { BrewlogDatabase } from '../db'
import { parseRepositoryId } from './validation'

export async function createImageAsset(
  database: BrewlogDatabase,
  input: ImageAssetInput,
) {
  const image = ImageAssetSchema.parse(input)
  return database.transaction('rw', database.imageAssets, async () => {
    if (await database.imageAssets.get(image.id)) {
      throw new DuplicateRecordError('ImageAsset', image.id)
    }
    await database.imageAssets.add(image)
    return image
  })
}

export async function updateImageAsset(
  database: BrewlogDatabase,
  id: UUID,
  input: ImageAssetInput,
) {
  id = parseRepositoryId(id)
  const candidate = ImageAssetSchema.parse(input)
  if (candidate.id !== id) {
    throw new InvalidOperationError('ImageAsset update ID does not match.')
  }

  return database.transaction('rw', database.imageAssets, async () => {
    const current = await database.imageAssets.get(id)
    if (!current) {
      throw new MissingRecordError('ImageAsset', id)
    }
    const image = ImageAssetSchema.parse({
      ...candidate,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    })
    await database.imageAssets.put(image)
    return image
  })
}

export async function getImageAsset(database: BrewlogDatabase, id: UUID) {
  id = parseRepositoryId(id)
  const image = await database.imageAssets.get(id)
  if (!image) {
    throw new MissingRecordError('ImageAsset', id)
  }
  return ImageAssetSchema.parse(image)
}

export async function listImageAssets(database: BrewlogDatabase) {
  const records = await database.imageAssets.toArray()
  return records.map((record) => ImageAssetSchema.parse(record))
}

export async function deleteImageAsset(
  database: BrewlogDatabase,
  id: UUID,
): Promise<void> {
  id = parseRepositoryId(id)
  await database.transaction(
    'rw',
    database.imageAssets,
    database.products,
    database.roasteries,
    async () => {
      if (!(await database.imageAssets.get(id))) {
        throw new MissingRecordError('ImageAsset', id)
      }
      const [products, roasteries] = await Promise.all([
        database.products.where('imageId').equals(id).count(),
        database.roasteries.where('logoImageId').equals(id).count(),
      ])
      if (products > 0) {
        throw new ReferencedRecordError('ImageAsset', id, 'Product')
      }
      if (roasteries > 0) {
        throw new ReferencedRecordError('ImageAsset', id, 'Roastery')
      }
      await database.imageAssets.delete(id)
    },
  )
}
