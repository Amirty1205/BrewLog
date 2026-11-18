import { describe, expect, it } from 'vitest'
import {
  CoffeeSourceSchema,
  MyCoffeeSchema,
  ProductSchema,
  ProductSourceSchema,
  ProductWithSourcesSchema,
  RoasterySchema,
} from './coffee'
import { UUIDSchema } from './shared'

const createdAt = '2025-01-01T00:00:00.000Z'

function entity(id: string) {
  return {
    id: UUIDSchema.parse(id),
    createdAt,
    updatedAt: createdAt,
  }
}

function bag(overrides: Record<string, unknown> = {}) {
  return {
    ...entity('10000000-0000-4000-8000-000000000001'),
    productId: UUIDSchema.parse('20000000-0000-4000-8000-000000000001'),
    purchasePriceToman: 850_000,
    packageWeightGrams: 250,
    purchaseDate: '2025-01-01',
    ...overrides,
  }
}

describe('CoffeeSourceSchema', () => {
  it('accepts source details and validates altitude ranges', () => {
    const source = CoffeeSourceSchema.parse({
      ...entity('30000000-0000-4000-8000-000000000001'),
      name: 'Guji',
      country: 'Ethiopia',
      varieties: ['Heirloom'],
      altitudeMinMeters: 1800,
      altitudeMaxMeters: 2200,
      harvestYear: 2024,
    })

    expect(source.varieties).toEqual(['Heirloom'])
    expect(
      CoffeeSourceSchema.safeParse({
        ...source,
        altitudeMinMeters: 2300,
        altitudeMaxMeters: 2200,
      }).success,
    ).toBe(false)
  })

  it('defaults varieties and rejects empty names', () => {
    const source = CoffeeSourceSchema.parse({
      ...entity('30000000-0000-4000-8000-000000000002'),
      name: 'Colombia Huila',
    })

    expect(source.varieties).toEqual([])
    expect(
      CoffeeSourceSchema.safeParse({ ...source, name: ' ' }).success,
    ).toBe(false)
  })
})

describe('RoasterySchema and ProductSchema', () => {
  it('keeps product and source names independent, even when equal', () => {
    const name = 'Las Flores'
    const source = CoffeeSourceSchema.parse({
      ...entity('30000000-0000-4000-8000-000000000003'),
      name,
    })
    const product = ProductSchema.parse({
      ...entity('20000000-0000-4000-8000-000000000002'),
      name,
      roasteryId: UUIDSchema.parse('40000000-0000-4000-8000-000000000001'),
      roasterTastingNotes: 'Apricot, cacao',
    })

    expect(product.name).toBe(source.name)
    expect(product.roasterTastingNotes).toBe('Apricot, cacao')
  })

  it('accepts valid HTTP(S) websites and rejects other schemes', () => {
    const roastery = {
      ...entity('40000000-0000-4000-8000-000000000002'),
      name: 'North Roast',
    }

    expect(
      RoasterySchema.safeParse({
        ...roastery,
        website: 'https://example.com',
      }).success,
    ).toBe(true)
    expect(
      RoasterySchema.safeParse({
        ...roastery,
        website: 'javascript:alert(1)',
      }).success,
    ).toBe(false)
  })
})

describe('ProductSourceSchema', () => {
  it('allows multiple sources and unknown blend proportions', () => {
    const productId = UUIDSchema.parse(
      '20000000-0000-4000-8000-000000000003',
    )
    const sources = [
      ProductSourceSchema.parse({
        ...entity('50000000-0000-4000-8000-000000000001'),
        productId,
        coffeeSourceId: UUIDSchema.parse(
          '30000000-0000-4000-8000-000000000004',
        ),
        blendProportionPercent: 35,
      }),
      ProductSourceSchema.parse({
        ...entity('50000000-0000-4000-8000-000000000002'),
        productId,
        coffeeSourceId: UUIDSchema.parse(
          '30000000-0000-4000-8000-000000000005',
        ),
      }),
    ]

    expect(sources.map((source) => source.blendProportionPercent)).toEqual([
      35,
      undefined,
    ])
    expect(
      ProductSourceSchema.safeParse({
        ...sources[0],
        blendProportionPercent: 101,
      }).success,
    ).toBe(false)
  })
})

describe('ProductWithSourcesSchema', () => {
  const product = ProductSchema.parse({
    ...entity('20000000-0000-4000-8000-000000000010'),
    name: 'House Blend',
    roasteryId: UUIDSchema.parse('40000000-0000-4000-8000-000000000010'),
  })

  function sourceLink(id: string, coffeeSourceId: string, proportion?: number) {
    return ProductSourceSchema.parse({
      ...entity(id),
      productId: product.id,
      coffeeSourceId: UUIDSchema.parse(coffeeSourceId),
      ...(proportion === undefined
        ? {}
        : { blendProportionPercent: proportion }),
    })
  }

  it('requires at least one source for a product', () => {
    expect(
      ProductWithSourcesSchema.safeParse({ product, sources: [] }).success,
    ).toBe(false)
  })

  it('accepts multiple sources when all specified proportions total 100%', () => {
    const sources = [
      sourceLink(
        '50000000-0000-4000-8000-000000000010',
        '30000000-0000-4000-8000-000000000010',
        35,
      ),
      sourceLink(
        '50000000-0000-4000-8000-000000000011',
        '30000000-0000-4000-8000-000000000011',
        65,
      ),
    ]

    expect(ProductWithSourcesSchema.safeParse({ product, sources }).success).toBe(
      true,
    )
  })

  it('rejects fully specified proportions that do not total 100%', () => {
    const sources = [
      sourceLink(
        '50000000-0000-4000-8000-000000000012',
        '30000000-0000-4000-8000-000000000012',
        40,
      ),
      sourceLink(
        '50000000-0000-4000-8000-000000000013',
        '30000000-0000-4000-8000-000000000013',
        50,
      ),
    ]

    expect(ProductWithSourcesSchema.safeParse({ product, sources }).success).toBe(
      false,
    )
  })

  it('does not require 100% when any source proportion is unknown', () => {
    const sources = [
      sourceLink(
        '50000000-0000-4000-8000-000000000014',
        '30000000-0000-4000-8000-000000000014',
        35,
      ),
      sourceLink(
        '50000000-0000-4000-8000-000000000015',
        '30000000-0000-4000-8000-000000000015',
      ),
    ]

    expect(ProductWithSourcesSchema.safeParse({ product, sources }).success).toBe(
      true,
    )
  })

  it('rejects source links assigned to another product', () => {
    const source = sourceLink(
      '50000000-0000-4000-8000-000000000016',
      '30000000-0000-4000-8000-000000000016',
    )

    expect(
      ProductWithSourcesSchema.safeParse({
        product,
        sources: [{ ...source, productId: UUIDSchema.parse(
          '20000000-0000-4000-8000-000000000011',
        ) }],
      }).success,
    ).toBe(false)
  })
})

describe('MyCoffeeSchema', () => {
  it('defaults remaining weight, status, finish state, and whole-bean state', () => {
    const parsed = MyCoffeeSchema.parse(bag({ packageWeightGrams: 250.5 }))

    expect(parsed.remainingWeightGrams).toBe(250.5)
    expect(parsed.remainingWeightStatus).toBe('estimated')
    expect(parsed.isFinished).toBe(false)
    expect(parsed.preGround).toBe(false)
  })

  it('requires a checkpoint reference for manually corrected remaining weight', () => {
    const adjustmentId = UUIDSchema.parse(
      '70000000-0000-4000-8000-000000000010',
    )

    expect(
      MyCoffeeSchema.safeParse(
        bag({ remainingWeightStatus: 'manually-corrected' }),
      ).success,
    ).toBe(false)
    expect(
      MyCoffeeSchema.safeParse(
        bag({
          remainingWeightStatus: 'manually-corrected',
          remainingWeightAdjustmentId: adjustmentId,
        }),
      ).success,
    ).toBe(true)
    expect(
      MyCoffeeSchema.safeParse(
        bag({ remainingWeightAdjustmentId: adjustmentId }),
      ).success,
    ).toBe(false)
  })

  it('validates Toman amounts, weights, dates, and independent coffee ratings', () => {
    expect(MyCoffeeSchema.safeParse(bag({ purchasePriceToman: 0 })).success).toBe(
      true,
    )
    expect(
      MyCoffeeSchema.safeParse(bag({ purchasePriceToman: -1 })).success,
    ).toBe(false)
    expect(
      MyCoffeeSchema.safeParse(bag({ purchasePriceToman: 12.5 })).success,
    ).toBe(false)
    expect(
      MyCoffeeSchema.safeParse(bag({ packageWeightGrams: -1 })).success,
    ).toBe(false)
    expect(
      MyCoffeeSchema.safeParse(bag({ remainingWeightGrams: -1 })).success,
    ).toBe(false)
    expect(
      MyCoffeeSchema.safeParse(bag({ purchaseDate: '2025-02-29' })).success,
    ).toBe(false)
    expect(
      MyCoffeeSchema.safeParse(bag({ roastDate: 'not-a-date' })).success,
    ).toBe(false)

    for (const rating of [1, 10]) {
      expect(
        MyCoffeeSchema.safeParse(bag({ personalCoffeeRating: rating })).success,
      ).toBe(true)
    }
    for (const rating of [0, 11, 1.5]) {
      expect(
        MyCoffeeSchema.safeParse(bag({ personalCoffeeRating: rating })).success,
      ).toBe(false)
    }
  })

  it('only accepts grind details for pre-ground coffee', () => {
    expect(
      MyCoffeeSchema.safeParse({
        ...bag(),
        intendedBrewMethod: 'V60',
      }).success,
    ).toBe(false)
    expect(
      MyCoffeeSchema.safeParse({
        ...bag(),
        originalRoasterGrindDescription: 'Medium-fine',
      }).success,
    ).toBe(false)

    expect(MyCoffeeSchema.safeParse(bag({ preGround: true })).success).toBe(
      true,
    )
    expect(
      MyCoffeeSchema.safeParse({
        ...bag({ preGround: true }),
        intendedBrewMethod: 'V60',
        originalRoasterGrindDescription: 'Medium-fine',
      }).success,
    ).toBe(true)
  })

  it('rejects brew-rating fields on a purchased bag', () => {
    expect(
      MyCoffeeSchema.safeParse(bag({ personalBrewRating: 8 })).success,
    ).toBe(false)
  })
})
