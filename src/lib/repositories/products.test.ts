import { describe, expect, it } from 'vitest'
import { UUIDSchema } from '@/domain/shared'
import { BrewlogDatabase } from '../db'
import {
  DuplicateRecordError,
  InvalidReferenceError,
  MissingRecordError,
  ReferencedRecordError,
} from '../domain-errors'
import { createMyCoffee } from './my-coffees'
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from './products'
import { seedProduct, productSource } from '@/test/repository-fixtures'

function testDatabase() {
  return new BrewlogDatabase(`Brewlog-product-repository-${crypto.randomUUID()}`)
}

describe('Product repository', () => {
  it('creates, retrieves relationships, lists, and updates a product', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const seeded = await seedProduct(database)
      const details = await getProduct(database, seeded.product.id)

      expect(details.product).toEqual(seeded.product)
      expect(details.roastery).toEqual(seeded.roastery)
      expect(details.sources).toHaveLength(1)
      expect(details.sources[0].coffeeSource).toEqual(seeded.source)

      expect(await listProducts(database)).toEqual([seeded.product])

      const updatedProduct = {
        ...seeded.product,
        name: 'Updated blend',
        createdAt: '2020-01-01T00:00:00.000Z',
      }
      const updated = await updateProduct(database, seeded.product.id, {
        product: updatedProduct,
        sources: [productSource(seeded.product.id, seeded.source.id, 2, 100)],
      })
      expect(updated.product.name).toBe('Updated blend')
      expect(updated.product.createdAt).toBe(seeded.product.createdAt)
      expect(await database.productSources.where('productId').equals(seeded.product.id).count()).toBe(1)
    } finally {
      await database.delete()
    }
  })

  it('rejects duplicate and missing products and invalid references', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const seeded = await seedProduct(database)
      const missingProductId = UUIDSchema.parse(
        '20000000-0000-4000-8000-000000000099',
      )
      await expect(
        getProduct(database, missingProductId),
      ).rejects.toBeInstanceOf(MissingRecordError)
      await expect(
        deleteProduct(database, missingProductId),
      ).rejects.toBeInstanceOf(MissingRecordError)
      const input = {
        product: seeded.product,
        sources: [productSource(seeded.product.id, seeded.source.id, 1, 100)],
      }

      await expect(createProduct(database, input)).rejects.toBeInstanceOf(
        DuplicateRecordError,
      )
      await expect(
        updateProduct(
          database,
          UUIDSchema.parse('20000000-0000-4000-8000-000000000099'),
          {
            ...input,
            product: {
              ...input.product,
              id: UUIDSchema.parse(
                '20000000-0000-4000-8000-000000000099',
              ),
            },
            sources: [
              productSource(
                UUIDSchema.parse('20000000-0000-4000-8000-000000000099'),
                seeded.source.id,
                2,
                100,
              ),
            ],
          },
        ),
      ).rejects.toBeInstanceOf(MissingRecordError)

      const missingSource = productSource(
        seeded.product.id,
        UUIDSchema.parse('30000000-0000-4000-8000-000000000099'),
        3,
        100,
      )
      await expect(
        updateProduct(database, seeded.product.id, {
          product: seeded.product,
          sources: [missingSource],
        }),
      ).rejects.toBeInstanceOf(InvalidReferenceError)
      expect(
        await database.productSources
          .where('productId')
          .equals(seeded.product.id)
          .count(),
      ).toBe(1)
      expect(await getProduct(database, seeded.product.id)).toMatchObject({
        sources: [{ coffeeSource: seeded.source }],
      })
    } finally {
      await database.delete()
    }
  })

  it('rolls back product and link changes if a link write fails', async () => {
    const database = testDatabase()
    let hookAttached = false
    const rejectLinkWrite = () => {
      throw new Error('forced ProductSource write failure')
    }
    try {
      await database.open()
      const seeded = await seedProduct(database)
      database.productSources.hook('creating', rejectLinkWrite)
      hookAttached = true

      await expect(
        updateProduct(database, seeded.product.id, {
          product: { ...seeded.product, name: 'Must roll back' },
          sources: [
            productSource(seeded.product.id, seeded.source.id, 99, 100),
          ],
        }),
      ).rejects.toThrow('forced ProductSource write failure')
      expect(await database.products.get(seeded.product.id)).toEqual(
        seeded.product,
      )
      expect(
        await database.productSources
          .where('productId')
          .equals(seeded.product.id)
          .toArray(),
      ).toHaveLength(1)
    } finally {
      if (hookAttached) {
        database.productSources
          .hook('creating')
          .unsubscribe(rejectLinkWrite)
      }
      await database.delete()
    }
  })

  it('prevents deleting products with bags and removes links on allowed deletion', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const seeded = await seedProduct(database)
      await createMyCoffee(database, {
        id: UUIDSchema.parse('10000000-0000-4000-8000-000000000001'),
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        productId: seeded.product.id,
        purchasePriceToman: 850_000,
        packageWeightGrams: 250,
        purchaseDate: '2025-01-01',
      })
      await expect(
        deleteProduct(database, seeded.product.id),
      ).rejects.toBeInstanceOf(ReferencedRecordError)
      expect(await database.products.get(seeded.product.id)).toBeDefined()

      const emptyCatalog = await seedProduct(database, 2)
      await deleteProduct(database, emptyCatalog.product.id)
      expect(await database.products.get(emptyCatalog.product.id)).toBeUndefined()
      expect(
        await database.productSources
          .where('productId')
          .equals(emptyCatalog.product.id)
          .count(),
      ).toBe(0)
      expect(await database.coffeeSources.get(emptyCatalog.source.id)).toEqual(
        emptyCatalog.source,
      )
      expect(await database.roasteries.get(emptyCatalog.roastery.id)).toEqual(
        emptyCatalog.roastery,
      )
    } finally {
      await database.delete()
    }
  })
})
