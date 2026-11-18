import { describe, expect, it } from 'vitest'
import {
  CoffeeSourceSchema,
  ProductSchema,
  ProductSourceSchema,
  RoasterySchema,
} from '@/domain/coffee'
import { UUIDSchema } from '@/domain/shared'
import { BrewlogDatabase } from './db'
import { InvalidReferenceError } from './domain-errors'
import { saveProductWithSources } from './products'

const createdAt = '2025-01-01T00:00:00.000Z'

function testDatabaseName() {
  return `Brewlog-product-test-${crypto.randomUUID()}`
}

function entity(id: string) {
  return {
    id: UUIDSchema.parse(id),
    createdAt,
    updatedAt: createdAt,
  }
}

describe('saveProductWithSources', () => {
  it('rejects a product without source links before persisting it', async () => {
    const database = new BrewlogDatabase(testDatabaseName())
    const roastery = RoasterySchema.parse({
      ...entity('40000000-0000-4000-8000-000000000001'),
      name: 'North Roast',
    })
    const product = ProductSchema.parse({
      ...entity('20000000-0000-4000-8000-000000000001'),
      name: 'House Blend',
      roasteryId: roastery.id,
    })

    try {
      await database.open()
      await database.roasteries.add(roastery)

      await expect(
        saveProductWithSources(database, { product, sources: [] }),
      ).rejects.toThrow('at least one coffee source')
      expect(await database.products.count()).toBe(0)
    } finally {
      await database.delete()
    }
  })

  it('persists a product with multiple existing source links', async () => {
    const database = new BrewlogDatabase(testDatabaseName())
    const roastery = RoasterySchema.parse({
      ...entity('40000000-0000-4000-8000-000000000002'),
      name: 'North Roast',
    })
    const product = ProductSchema.parse({
      ...entity('20000000-0000-4000-8000-000000000002'),
      name: 'House Blend',
      roasteryId: roastery.id,
    })
    const sources = [
      CoffeeSourceSchema.parse({
        ...entity('30000000-0000-4000-8000-000000000001'),
        name: 'Guji',
      }),
      CoffeeSourceSchema.parse({
        ...entity('30000000-0000-4000-8000-000000000002'),
        name: 'Huila',
      }),
    ]
    const sourceLinks = sources.map((source, index) =>
      ProductSourceSchema.parse({
        ...entity(
          `50000000-0000-4000-8000-${(index + 1)
            .toString()
            .padStart(12, '0')}`,
        ),
        productId: product.id,
        coffeeSourceId: source.id,
        blendProportionPercent: index === 0 ? 35 : 65,
      }),
    )

    try {
      await database.open()
      await database.roasteries.add(roastery)
      await database.coffeeSources.bulkAdd(sources)

      await saveProductWithSources(database, {
        product,
        sources: sourceLinks,
      })

      expect(await database.products.get(product.id)).toEqual(product)
      expect(
        await database.productSources
          .where('productId')
          .equals(product.id)
          .count(),
      ).toBe(2)
    } finally {
      await database.delete()
    }
  })

  it('rejects a missing roastery before writing records', async () => {
    const database = new BrewlogDatabase(testDatabaseName())
    const product = ProductSchema.parse({
      ...entity('20000000-0000-4000-8000-000000000003'),
      name: 'House Blend',
      roasteryId: UUIDSchema.parse(
        '40000000-0000-4000-8000-000000000003',
      ),
    })
    const source = ProductSourceSchema.parse({
      ...entity('50000000-0000-4000-8000-000000000003'),
      productId: product.id,
      coffeeSourceId: UUIDSchema.parse(
        '30000000-0000-4000-8000-000000000003',
      ),
    })

    try {
      await database.open()
      await expect(
        saveProductWithSources(database, { product, sources: [source] }),
      ).rejects.toBeInstanceOf(InvalidReferenceError)
      expect(await database.products.count()).toBe(0)
      expect(await database.productSources.count()).toBe(0)
    } finally {
      await database.delete()
    }
  })

  it('rejects a missing coffee source before writing product links', async () => {
    const database = new BrewlogDatabase(testDatabaseName())
    const roastery = RoasterySchema.parse({
      ...entity('40000000-0000-4000-8000-000000000004'),
      name: 'North Roast',
    })
    const product = ProductSchema.parse({
      ...entity('20000000-0000-4000-8000-000000000004'),
      name: 'House Blend',
      roasteryId: roastery.id,
    })
    const source = ProductSourceSchema.parse({
      ...entity('50000000-0000-4000-8000-000000000004'),
      productId: product.id,
      coffeeSourceId: UUIDSchema.parse(
        '30000000-0000-4000-8000-000000000004',
      ),
    })

    try {
      await database.open()
      await database.roasteries.add(roastery)

      await expect(
        saveProductWithSources(database, { product, sources: [source] }),
      ).rejects.toBeInstanceOf(InvalidReferenceError)
      expect(await database.products.count()).toBe(0)
      expect(await database.productSources.count()).toBe(0)
    } finally {
      await database.delete()
    }
  })
})
