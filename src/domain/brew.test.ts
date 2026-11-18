import { describe, expect, it } from 'vitest'
import { BrewSchema, WeightAdjustmentSchema } from './brew'
import { UUIDSchema } from './shared'

const timestamp = '2025-01-01T08:30:00.000Z'

function brew(overrides: Record<string, unknown> = {}) {
  return {
    id: UUIDSchema.parse('60000000-0000-4000-8000-000000000001'),
    myCoffeeId: UUIDSchema.parse('10000000-0000-4000-8000-000000000001'),
    createdAt: timestamp,
    updatedAt: timestamp,
    brewedAt: timestamp,
    brewMethod: 'V60',
    coffeeDoseGrams: 15,
    waterAmountGrams: 250,
    temperatureCelsius: 93,
    brewDurationSeconds: 150,
    personalTastingNotes: 'Apricot',
    ...overrides,
  }
}

describe('BrewSchema', () => {
  it('validates recipe measurements and independent brew ratings', () => {
    expect(BrewSchema.safeParse(brew({ personalBrewRating: 1 })).success).toBe(
      true,
    )
    expect(BrewSchema.safeParse(brew({ personalBrewRating: 10 })).success).toBe(
      true,
    )

    for (const rating of [0, 11, 2.5]) {
      expect(
        BrewSchema.safeParse(brew({ personalBrewRating: rating })).success,
      ).toBe(false)
    }

    expect(
      BrewSchema.safeParse(brew({ coffeeDoseGrams: -0.1 })).success,
    ).toBe(false)
    expect(
      BrewSchema.safeParse(brew({ waterAmountGrams: -1 })).success,
    ).toBe(false)
    expect(
      BrewSchema.safeParse(brew({ temperatureCelsius: -1 })).success,
    ).toBe(false)
    expect(
      BrewSchema.safeParse(brew({ brewedAt: '2025-01-01T08:30:00+03:30' }))
        .success,
    ).toBe(false)
  })

  it('does not accept bag-rating or roaster-note fields as brew fields', () => {
    expect(
      BrewSchema.safeParse(
        brew({
          personalCoffeeRating: 8,
          roasterTastingNotes: 'Cacao',
        }),
      ).success,
    ).toBe(false)
  })
})

describe('WeightAdjustmentSchema', () => {
  it('accepts nonnegative measured weights and rejects invalid values', () => {
    const adjustment = {
      id: UUIDSchema.parse('70000000-0000-4000-8000-000000000001'),
      myCoffeeId: UUIDSchema.parse('10000000-0000-4000-8000-000000000001'),
      createdAt: timestamp,
      updatedAt: timestamp,
      measuredAt: timestamp,
      measuredRemainingWeightGrams: 0,
    }

    expect(WeightAdjustmentSchema.safeParse(adjustment).success).toBe(true)
    expect(
      WeightAdjustmentSchema.safeParse({
        ...adjustment,
        measuredRemainingWeightGrams: -1,
      }).success,
    ).toBe(false)
    expect(
      WeightAdjustmentSchema.safeParse({
        ...adjustment,
        measuredAt: 'invalid',
      }).success,
    ).toBe(false)
  })
})
