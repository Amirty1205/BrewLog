import {
  CoffeeSourceSchema,
  ProductSchema,
  ProductSourceSchema,
  RoasterySchema,
} from '@/domain/coffee'
import type {
  CoffeeSource,
  Product,
  ProductSource,
  ProductWithSourcesInput,
  Roastery,
} from '@/domain/coffee'
import type { UUID } from '@/domain/shared'
import {
  InvalidOperationError,
  InvalidReferenceError,
  MissingRecordError,
  ReferencedRecordError,
} from '../domain-errors'
import type { BrewlogDatabase } from '../db'
import { saveProductWithSources } from '../products'
import { parseRepositoryId } from './validation'

export interface ProductWithRelationships {
  product: Product
  roastery: Roastery
  sources: Array<{
    link: ProductSource
    coffeeSource: CoffeeSource
  }>
}

export async function createProduct(
  database: BrewlogDatabase,
  input: ProductWithSourcesInput,
) {
  return saveProductWithSources(database, input, 'create')
}

export async function updateProduct(
  database: BrewlogDatabase,
  id: UUID,
  input: ProductWithSourcesInput,
) {
  id = parseRepositoryId(id)
  const parsed = ProductSchema.parse(input.product)
  if (parsed.id !== id) {
    throw new InvalidOperationError('Product update ID does not match.')
  }
  return saveProductWithSources(database, input, 'update')
}

export async function getProduct(
  database: BrewlogDatabase,
  id: UUID,
): Promise<ProductWithRelationships> {
  id = parseRepositoryId(id)
  return database.transaction(
    'r',
    database.products,
    database.roasteries,
    database.productSources,
    database.coffeeSources,
    async () => {
      const storedProduct = await database.products.get(id)
      if (!storedProduct) {
        throw new MissingRecordError('Product', id)
      }
      const product = ProductSchema.parse(storedProduct)
      const storedRoastery = await database.roasteries.get(product.roasteryId)
      if (!storedRoastery) {
        throw new InvalidReferenceError('roastery', product.roasteryId)
      }
      const roastery = RoasterySchema.parse(storedRoastery)
      const links = await database.productSources
        .where('productId')
        .equals(product.id)
        .toArray()
      if (links.length === 0) {
        throw new InvalidReferenceError('ProductSource for product', id)
      }
      const parsedLinks = links.map((link) => ProductSourceSchema.parse(link))
      const sources = await database.coffeeSources.bulkGet(
        parsedLinks.map((link) => link.coffeeSourceId),
      )
      const relationships = parsedLinks.map((link, index) => {
        const storedCoffeeSource = sources[index]
        if (!storedCoffeeSource) {
          throw new InvalidReferenceError(
            'coffee source',
            link.coffeeSourceId,
          )
        }
        return {
          link,
          coffeeSource: CoffeeSourceSchema.parse(storedCoffeeSource),
        }
      })

      return { product, roastery, sources: relationships }
    },
  )
}

export async function listProducts(database: BrewlogDatabase) {
  const records = await database.products.toArray()
  return records.map((record) => ProductSchema.parse(record))
}

export async function deleteProduct(
  database: BrewlogDatabase,
  id: UUID,
): Promise<void> {
  id = parseRepositoryId(id)
  await database.transaction(
    'rw',
    database.products,
    database.productSources,
    database.myCoffees,
    async () => {
      if (!(await database.products.get(id))) {
        throw new MissingRecordError('Product', id)
      }
      const bags = await database.myCoffees
        .where('productId')
        .equals(id)
        .count()
      if (bags > 0) {
        throw new ReferencedRecordError('Product', id, 'MyCoffee')
      }
      await database.productSources
        .where('productId')
        .equals(id)
        .delete()
      await database.products.delete(id)
    },
  )
}
