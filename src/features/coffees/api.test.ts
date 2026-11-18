import { describe, expect, it } from 'vitest'
import type { WeightAdjustment } from '@/domain/brew'
import { MyCoffeeSchema } from '@/domain/coffee'
import type { ImageAsset } from '@/domain/image'
import { UUIDSchema } from '@/domain/shared'
import {
  InvalidReferenceError,
  MissingRecordError,
} from '@/lib/domain-errors'
import type { ApplicationRepositories } from '@/app/providers/ApplicationRepositoriesContext'
import {
  coffeeSource,
  entityTimestamp,
  myCoffee,
  product,
  productSource,
  roastery,
  weightAdjustment,
} from '@/test/repository-fixtures'
import { loadMyCoffeeDetail, loadMyCoffeeList } from './api'

type MyCoffeeReadRepositories = Pick<
  ApplicationRepositories,
  | 'listMyCoffees'
  | 'getMyCoffee'
  | 'getProduct'
  | 'getImageAsset'
  | 'listWeightAdjustmentsForMyCoffee'
>

type ProductRelationships = Awaited<
  ReturnType<ApplicationRepositories['getProduct']>
>

const imageId = UUIDSchema.parse('80000000-0000-4000-8000-000000000001')

function productRelationships(
  sequence: number,
  sourceSequences: number[],
  withImage = false,
): ProductRelationships {
  const catalogRoastery = {
    ...roastery(sequence),
    description: `Roastery description ${sequence}`,
  }
  const catalogProduct = {
    ...product(catalogRoastery.id, sequence),
    roasterDescription: `Product description ${sequence}`,
    roasterTastingNotes: `Roaster notes ${sequence}`,
    ...(withImage ? { imageId } : {}),
  }

  return {
    product: catalogProduct,
    roastery: catalogRoastery,
    sources: sourceSequences.map((sourceSequence, index) => {
      const source = {
        ...coffeeSource(sourceSequence),
        country: `Country ${sourceSequence}`,
        region: `Region ${sourceSequence}`,
        farm: `Farm ${sourceSequence}`,
        producer: `Producer ${sourceSequence}`,
        varieties: [`Variety ${sourceSequence}`],
        processingMethod: `Process ${sourceSequence}`,
      }

      return {
        link: productSource(
          catalogProduct.id,
          source.id,
          sequence * 10 + index + 1,
          sourceSequences.length === 1 ? 100 : index === 0 ? 70 : 30,
        ),
        coffeeSource: source,
      }
    }),
  }
}

function imageAsset(id = imageId): ImageAsset {
  return {
    id,
    createdAt: entityTimestamp,
    updatedAt: entityTimestamp,
    mimeType: 'image/webp',
    blob: new Blob(['coffee image'], { type: 'image/webp' }),
  }
}

function createReadRepositories(
  overrides: Partial<MyCoffeeReadRepositories> = {},
): MyCoffeeReadRepositories {
  return {
    listMyCoffees: async () => [],
    getMyCoffee: async () => {
      throw new Error('Unexpected MyCoffee read.')
    },
    getProduct: async () => {
      throw new Error('Unexpected Product read.')
    },
    getImageAsset: async () => {
      throw new Error('Unexpected ImageAsset read.')
    },
    listWeightAdjustmentsForMyCoffee: async () => [],
    ...overrides,
  }
}

describe('My Coffees application queries', () => {
  it('composes a bag with its Product, Roastery, one source, and product image', async () => {
    const bag = myCoffee(productRelationships(1, [1], true).product.id, 1)
    const relatedProduct = productRelationships(1, [1], true)
    const image = imageAsset()
    const result = await loadMyCoffeeList(
      createReadRepositories({
        listMyCoffees: async () => [bag],
        getProduct: async () => relatedProduct,
        getImageAsset: async () => image,
      }),
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      myCoffee: {
        id: bag.id,
        productId: relatedProduct.product.id,
        purchasePriceToman: bag.purchasePriceToman,
        packageWeightGrams: bag.packageWeightGrams,
        remainingWeightGrams: bag.remainingWeightGrams,
        remainingWeightStatus: 'estimated',
        isFinished: false,
      },
      product: { id: relatedProduct.product.id, name: relatedProduct.product.name },
      roastery: {
        id: relatedProduct.roastery.id,
        name: relatedProduct.roastery.name,
      },
      sources: [
        {
          link: { blendProportionPercent: 100 },
          coffeeSource: {
            id: relatedProduct.sources[0].coffeeSource.id,
            name: relatedProduct.sources[0].coffeeSource.name,
            country: 'Country 1',
            region: 'Region 1',
            farm: 'Farm 1',
            producer: 'Producer 1',
          },
        },
      ],
      productImage: {
        id: image.id,
        mimeType: image.mimeType,
        blob: image.blob,
      },
    })
  })

  it('preserves multiple source relationships and blend proportions', async () => {
    const relatedProduct = productRelationships(2, [2, 3])
    const bag = myCoffee(relatedProduct.product.id, 2)
    const checkpoint = weightAdjustment(bag.id, 2, 190)
    const manuallyMeasuredBag = MyCoffeeSchema.parse({
      ...bag,
      remainingWeightGrams: 190,
      remainingWeightStatus: 'manually-corrected',
      remainingWeightAdjustmentId: checkpoint.id,
    })
    const [result] = await loadMyCoffeeList(
      createReadRepositories({
        listMyCoffees: async () => [manuallyMeasuredBag],
        getProduct: async () => relatedProduct,
      }),
    )

    expect(result.sources).toHaveLength(2)
    expect(
      result.sources.map(({ link, coffeeSource: source }) => ({
        sourceId: source.id,
        proportion: link.blendProportionPercent,
      })),
    ).toEqual([
      {
        sourceId: relatedProduct.sources[0].coffeeSource.id,
        proportion: 70,
      },
      {
        sourceId: relatedProduct.sources[1].coffeeSource.id,
        proportion: 30,
      },
    ])
    expect(result.myCoffee.remainingWeightStatus).toBe('manually-corrected')
    expect(result.myCoffee.remainingWeightGrams).toBe(190)
  })

  it('sorts newest purchases first and loads shared Product details once', async () => {
    const relatedProduct = productRelationships(3, [4])
    const older = {
      ...myCoffee(relatedProduct.product.id, 3),
      purchaseDate: '2024-12-01',
    }
    const newer = {
      ...myCoffee(relatedProduct.product.id, 4),
      purchaseDate: '2025-02-01',
    }
    let productReads = 0
    const result = await loadMyCoffeeList(
      createReadRepositories({
        listMyCoffees: async () => [older, newer],
        getProduct: async () => {
          productReads += 1
          return relatedProduct
        },
      }),
    )

    expect(result.map((item) => item.myCoffee.id)).toEqual([
      newer.id,
      older.id,
    ])
    expect(productReads).toBe(1)
  })

  it('propagates missing Product, source, or image references', async () => {
    const relatedProduct = productRelationships(5, [5], true)
    const bag = myCoffee(relatedProduct.product.id, 5)
    const missingProduct = new MissingRecordError(
      'Product',
      relatedProduct.product.id,
    )
    await expect(
      loadMyCoffeeList(
        createReadRepositories({
          listMyCoffees: async () => [bag],
          getProduct: async () => {
            throw missingProduct
          },
        }),
      ),
    ).rejects.toBe(missingProduct)

    const missingSource = new InvalidReferenceError('coffee source', 'missing')
    await expect(
      loadMyCoffeeList(
        createReadRepositories({
          listMyCoffees: async () => [bag],
          getProduct: async () => {
            throw missingSource
          },
        }),
      ),
    ).rejects.toBe(missingSource)

    const missingImage = new MissingRecordError('ImageAsset', imageId)
    await expect(
      loadMyCoffeeList(
        createReadRepositories({
          listMyCoffees: async () => [bag],
          getProduct: async () => relatedProduct,
          getImageAsset: async () => {
            throw missingImage
          },
        }),
      ),
    ).rejects.toBe(missingImage)
  })

  it('includes full product provenance, bag details, and weight history', async () => {
    const relatedProduct = productRelationships(6, [6, 7], true)
    const bag = MyCoffeeSchema.parse({
      ...myCoffee(relatedProduct.product.id, 6),
      roastDate: '2025-01-02',
      personalCoffeeRating: 9,
      preGround: true,
      intendedBrewMethod: 'V60',
      originalRoasterGrindDescription: 'Medium-fine',
    })
    const adjustment: WeightAdjustment = weightAdjustment(bag.id, 6, 175)
    const image = imageAsset()
    const detail = await loadMyCoffeeDetail(
      createReadRepositories({
        getMyCoffee: async () => bag,
        getProduct: async () => relatedProduct,
        getImageAsset: async () => image,
        listWeightAdjustmentsForMyCoffee: async () => [adjustment],
      }),
      bag.id,
    )

    expect(detail.myCoffee).toEqual(bag)
    expect(detail.product.roasterDescription).toBe('Product description 6')
    expect(detail.product.roasterTastingNotes).toBe('Roaster notes 6')
    expect(detail.roastery.description).toBe('Roastery description 6')
    expect(detail.sources[0].coffeeSource.processingMethod).toBe('Process 6')
    expect(detail.sources[1].coffeeSource.varieties).toEqual(['Variety 7'])
    expect(detail.myCoffee.personalCoffeeRating).toBe(9)
    expect(detail.myCoffee.preGround).toBe(true)
    expect(detail.myCoffee.intendedBrewMethod).toBe('V60')
    expect(detail.myCoffee.originalRoasterGrindDescription).toBe('Medium-fine')
    expect(detail.weightAdjustments).toEqual([adjustment])
    expect(detail.productImage).toEqual({
      id: image.id,
      mimeType: image.mimeType,
      blob: image.blob,
    })
  })

  it('returns an empty collection without fetching catalog records', async () => {
    let productReads = 0
    const result = await loadMyCoffeeList(
      createReadRepositories({
        listMyCoffees: async () => [],
        getProduct: async () => {
          productReads += 1
          throw new Error('No products should be requested.')
        },
      }),
    )

    expect(result).toEqual([])
    expect(productReads).toBe(0)
  })

  it('propagates query errors unchanged', async () => {
    const queryError = new Error('local database unavailable')
    await expect(
      loadMyCoffeeList(
        createReadRepositories({
          listMyCoffees: async () => {
            throw queryError
          },
        }),
      ),
    ).rejects.toBe(queryError)
  })
})
