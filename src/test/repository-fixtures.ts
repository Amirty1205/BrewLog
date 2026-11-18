import { BrewSchema, WeightAdjustmentSchema } from '@/domain/brew'
import {
  CoffeeSourceSchema,
  MyCoffeeSchema,
  ProductSchema,
  ProductSourceSchema,
  RoasterySchema,
} from '@/domain/coffee'
import type { BrewlogDatabase } from '@/lib/db'
import type { UUID } from '@/domain/shared'
import { UUIDSchema } from '@/domain/shared'
import { createCoffeeSource } from '@/lib/repositories/coffee-sources'
import { createProduct } from '@/lib/repositories/products'
import { createRoastery } from '@/lib/repositories/roasteries'

export const entityTimestamp = '2025-01-01T00:00:00.000Z'

function id(prefix: string, sequence: number): UUID {
  return UUIDSchema.parse(`${prefix}${sequence.toString().padStart(12, '0')}`)
}

export function entity(id: UUID) {
  return { id, createdAt: entityTimestamp, updatedAt: entityTimestamp }
}

export function coffeeSource(sequence = 1) {
  return CoffeeSourceSchema.parse({
    ...entity(id('30000000-0000-4000-8000-', sequence)),
    name: `Source ${sequence}`,
  })
}

export function roastery(sequence = 1) {
  return RoasterySchema.parse({
    ...entity(id('40000000-0000-4000-8000-', sequence)),
    name: `Roastery ${sequence}`,
  })
}

export function product(roasteryId: UUID, sequence = 1) {
  return ProductSchema.parse({
    ...entity(id('20000000-0000-4000-8000-', sequence)),
    name: `Product ${sequence}`,
    roasteryId,
  })
}

export function productSource(
  productId: UUID,
  coffeeSourceId: UUID,
  sequence = 1,
  blendProportionPercent?: number,
) {
  return ProductSourceSchema.parse({
    ...entity(id('50000000-0000-4000-8000-', sequence)),
    productId,
    coffeeSourceId,
    ...(blendProportionPercent === undefined
      ? {}
      : { blendProportionPercent }),
  })
}

export function myCoffee(productId: UUID, sequence = 1, packageWeightGrams = 250) {
  return MyCoffeeSchema.parse({
    ...entity(id('10000000-0000-4000-8000-', sequence)),
    productId,
    purchasePriceToman: 850_000,
    packageWeightGrams,
    purchaseDate: '2025-01-01',
  })
}

export function brew(
  myCoffeeId: UUID,
  sequence = 1,
  coffeeDoseGrams = 15,
  brewedAt = '2025-01-02T00:00:00.000Z',
) {
  return BrewSchema.parse({
    ...entity(id('60000000-0000-4000-8000-', sequence)),
    myCoffeeId,
    brewedAt,
    brewMethod: 'V60',
    coffeeDoseGrams,
    waterAmountGrams: 250,
    temperatureCelsius: 93,
    brewDurationSeconds: 150,
  })
}

export function weightAdjustment(
  myCoffeeId: UUID,
  sequence = 1,
  measuredRemainingWeightGrams = 180,
  measuredAt = '2025-01-03T00:00:00.000Z',
) {
  return WeightAdjustmentSchema.parse({
    ...entity(id('70000000-0000-4000-8000-', sequence)),
    myCoffeeId,
    measuredAt,
    measuredRemainingWeightGrams,
  })
}

export async function seedProduct(
  database: BrewlogDatabase,
  sequence = 1,
) {
  const source = coffeeSource(sequence)
  const roaster = roastery(sequence)
  const item = product(roaster.id, sequence)
  await createCoffeeSource(database, source)
  await createRoastery(database, roaster)
  await createProduct(database, {
    product: item,
    sources: [productSource(item.id, source.id, sequence, 100)],
  })
  return { source, roastery: roaster, product: item }
}
