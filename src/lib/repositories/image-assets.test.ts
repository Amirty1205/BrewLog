import { describe, expect, it } from 'vitest'
import { UUIDSchema } from '@/domain/shared'
import { BrewlogDatabase } from '../db'
import {
  DuplicateRecordError,
  MissingRecordError,
  ReferencedRecordError,
} from '../domain-errors'
import { createCoffeeSource } from './coffee-sources'
import {
  createImageAsset,
  deleteImageAsset,
  getImageAsset,
  listImageAssets,
  updateImageAsset,
} from './image-assets'
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from './products'
import {
  createRoastery,
  deleteRoastery,
  updateRoastery,
} from './roasteries'
import {
  coffeeSource,
  entityTimestamp,
  product,
  productSource,
  roastery,
} from '@/test/repository-fixtures'

function testDatabase() {
  return new BrewlogDatabase(`Brewlog-images-${crypto.randomUUID()}`)
}

function imageAsset(id: string) {
  return {
    id: UUIDSchema.parse(id),
    createdAt: entityTimestamp,
    updatedAt: entityTimestamp,
    mimeType: 'image/png',
    blob: new Blob(['coffee image'], { type: 'image/png' }),
  }
}

describe('ImageAsset repository', () => {
  it('creates, retrieves, lists, and deletes an unreferenced Blob', async () => {
    const database = testDatabase()
    const image = imageAsset('80000000-0000-4000-8000-000000000001')
    try {
      await database.open()
      await createImageAsset(database, image)
      const updated = await updateImageAsset(database, image.id, {
        ...image,
        mimeType: 'image/webp',
        blob: new Blob(['updated image'], { type: 'image/webp' }),
      })
      expect(updated.mimeType).toBe('image/webp')
      expect(updated.createdAt).toBe(image.createdAt)
      expect(await getImageAsset(database, image.id)).toEqual(updated)
      expect(await listImageAssets(database)).toEqual([updated])
      await deleteImageAsset(database, image.id)
      await expect(getImageAsset(database, image.id)).rejects.toBeInstanceOf(
        MissingRecordError,
      )
      await expect(createImageAsset(database, image)).resolves.toEqual(image)
      await expect(createImageAsset(database, image)).rejects.toBeInstanceOf(
        DuplicateRecordError,
      )
    } finally {
      await database.delete()
    }
  })

  it('prevents deletion while a Product or Roastery references the image', async () => {
    const database = testDatabase()
    const image = imageAsset('80000000-0000-4000-8000-000000000002')
    try {
      await database.open()
      await createImageAsset(database, image)
      const source = coffeeSource()
      await createCoffeeSource(database, source)
      const catalogRoastery = {
        ...roastery(),
        logoImageId: image.id,
      }
      await createRoastery(database, catalogRoastery)
      const catalogProduct = {
        ...product(catalogRoastery.id),
        imageId: image.id,
      }
      await createProduct(database, {
        product: catalogProduct,
        sources: [productSource(catalogProduct.id, source.id, 1, 100)],
      })

      await expect(deleteImageAsset(database, image.id)).rejects.toBeInstanceOf(
        ReferencedRecordError,
      )
      await deleteProduct(database, catalogProduct.id)
      await expect(deleteImageAsset(database, image.id)).rejects.toBeInstanceOf(
        ReferencedRecordError,
      )
      await deleteRoastery(database, catalogRoastery.id)
      await deleteImageAsset(database, image.id)
      expect(await database.imageAssets.get(image.id)).toBeUndefined()
    } finally {
      await database.delete()
    }
  })

  it('tracks Product and Roastery image replacement and removal', async () => {
    const database = testDatabase()
    const oldImage = imageAsset('80000000-0000-4000-8000-000000000003')
    const newImage = imageAsset('80000000-0000-4000-8000-000000000004')
    try {
      await database.open()
      await createImageAsset(database, oldImage)
      await createImageAsset(database, newImage)

      const source = coffeeSource(3)
      await createCoffeeSource(database, source)
      const catalogRoastery = {
        ...roastery(3),
        logoImageId: oldImage.id,
      }
      await createRoastery(database, catalogRoastery)
      const catalogProduct = {
        ...product(catalogRoastery.id, 3),
        imageId: oldImage.id,
      }
      await createProduct(database, {
        product: catalogProduct,
        sources: [productSource(catalogProduct.id, source.id, 3, 100)],
      })

      await expect(deleteImageAsset(database, oldImage.id)).rejects.toBeInstanceOf(
        ReferencedRecordError,
      )
      await updateProduct(database, catalogProduct.id, {
        product: { ...catalogProduct, imageId: newImage.id },
        sources: [productSource(catalogProduct.id, source.id, 3, 100)],
      })
      await expect(deleteImageAsset(database, oldImage.id)).rejects.toBeInstanceOf(
        ReferencedRecordError,
      )

      await updateRoastery(database, catalogRoastery.id, {
        ...catalogRoastery,
        logoImageId: newImage.id,
      })
      await deleteImageAsset(database, oldImage.id)
      await expect(deleteImageAsset(database, newImage.id)).rejects.toBeInstanceOf(
        ReferencedRecordError,
      )

      await updateProduct(database, catalogProduct.id, {
        product: { ...catalogProduct, imageId: undefined },
        sources: [productSource(catalogProduct.id, source.id, 3, 100)],
      })
      await expect(deleteImageAsset(database, newImage.id)).rejects.toBeInstanceOf(
        ReferencedRecordError,
      )
      await updateRoastery(database, catalogRoastery.id, {
        ...catalogRoastery,
        logoImageId: undefined,
      })
      await deleteImageAsset(database, newImage.id)

      expect(await database.imageAssets.get(oldImage.id)).toBeUndefined()
      expect(await database.imageAssets.get(newImage.id)).toBeUndefined()
    } finally {
      await database.delete()
    }
  })
})
