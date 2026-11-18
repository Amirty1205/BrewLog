import { ProductSchema, ProductWithSourcesSchema } from '@/domain/coffee'
import type { ProductWithSourcesInput } from '@/domain/coffee'
import {
  DuplicateRecordError,
  InvalidReferenceError,
  MissingRecordError,
} from './domain-errors'
import type { BrewlogDatabase } from './db'

export type ProductSaveMode = 'create' | 'update' | 'upsert'

export async function saveProductWithSources(
  database: BrewlogDatabase,
  input: ProductWithSourcesInput,
  mode: ProductSaveMode = 'upsert',
) {
  const productWithSources = ProductWithSourcesSchema.parse(input)
  const { product, sources } = productWithSources

  return database.transaction(
    'rw',
    database.roasteries,
    database.coffeeSources,
    database.products,
    database.productSources,
    database.imageAssets,
    async () => {
      const current = await database.products.get(product.id)
      if (mode === 'create' && current) {
        throw new DuplicateRecordError('Product', product.id)
      }
      if (mode === 'update' && !current) {
        throw new MissingRecordError('Product', product.id)
      }
      if (!(await database.roasteries.get(product.roasteryId))) {
        throw new InvalidReferenceError('roastery', product.roasteryId)
      }
      if (
        product.imageId &&
        !(await database.imageAssets.get(product.imageId))
      ) {
        throw new InvalidReferenceError('image asset', product.imageId)
      }

      const sourceRecords = await database.coffeeSources.bulkGet(
        sources.map((source) => source.coffeeSourceId),
      )
      if (sourceRecords.some((source) => source === undefined)) {
        const missingSource = sources.find(
          (_, index) => sourceRecords[index] === undefined,
        )
        throw new InvalidReferenceError(
          'coffee source',
          missingSource?.coffeeSourceId ?? 'unknown',
        )
      }
      const linkRecords = await database.productSources.bulkGet(
        sources.map((source) => source.id),
      )
      const conflictingLink = sources.find((_, index) => {
        const existing = linkRecords[index]
        return existing !== undefined && existing.productId !== product.id
      })
      if (conflictingLink) {
        throw new DuplicateRecordError('ProductSource', conflictingLink.id)
      }

      const productToSave = ProductSchema.parse({
        ...product,
        ...(current
          ? {
              createdAt: current.createdAt,
              updatedAt: new Date().toISOString(),
            }
          : {}),
      })
      await database.productSources
        .where('productId').equals(product.id)
        .delete()
      await database.products.put(productToSave)
      await database.productSources.bulkAdd(sources)

      return { product: productToSave, sources }
    },
  )
}
