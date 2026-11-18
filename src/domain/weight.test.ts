import { describe, expect, it } from 'vitest'
import type { Brew, WeightAdjustment } from './brew'
import { MyCoffeeSchema } from './coffee'
import { UUIDSchema } from './shared'
import { calculateRemainingWeight } from './weight'

const myCoffeeId = UUIDSchema.parse(
  '10000000-0000-4000-8000-000000000001',
)
const createdAt = '2025-01-01T00:00:00.000Z'

function brew(
  sequence: number,
  brewedAt: string,
  coffeeDoseGrams: number,
  overrides: Partial<Brew> = {},
): Brew {
  return {
    id: UUIDSchema.parse(
      `60000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
    ),
    myCoffeeId,
    createdAt,
    updatedAt: createdAt,
    brewedAt,
    brewMethod: 'V60',
    coffeeDoseGrams,
    waterAmountGrams: 250,
    temperatureCelsius: 93,
    brewDurationSeconds: 150,
    ...overrides,
  }
}

function adjustment(
  sequence: number,
  measuredAt: string,
  measuredRemainingWeightGrams: number,
): WeightAdjustment {
  return {
    id: UUIDSchema.parse(
      `70000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
    ),
    myCoffeeId,
    createdAt,
    updatedAt: createdAt,
    measuredAt,
    measuredRemainingWeightGrams,
  }
}

function calculate(
  packageWeightGrams: number,
  brews: readonly Brew[] = [],
  adjustments: readonly WeightAdjustment[] = [],
) {
  return calculateRemainingWeight({
    myCoffeeId,
    packageWeightGrams,
    brews,
    adjustments,
  })
}

describe('calculateRemainingWeight', () => {
  it('uses package weight as the estimated baseline and deducts multiple brews', () => {
    const result = calculate(250, [
      brew(1, '2025-01-02T00:00:00.000Z', 15),
      brew(2, '2025-01-03T00:00:00.000Z', 10),
    ])

    expect(result).toEqual({
      remainingWeightGrams: 225,
      remainingWeightStatus: 'estimated',
    })
  })

  it('resets the baseline at a measurement and ignores earlier brews', () => {
    const result = calculate(
      250,
      [
        brew(1, '2025-01-02T00:00:00.000Z', 30),
        brew(2, '2025-01-04T00:00:00.000Z', 15),
      ],
      [adjustment(1, '2025-01-03T00:00:00.000Z', 200)],
    )

    expect(result.remainingWeightGrams).toBe(185)
    expect(result.remainingWeightStatus).toBe('manually-corrected')
    expect(result.remainingWeightAdjustmentId).toBe(
      '70000000-0000-4000-8000-000000000001',
    )
  })

  it('processes a same-time measurement before deducting the brew', () => {
    const timestamp = '2025-01-03T00:00:00.000Z'
    const result = calculate(
      250,
      [brew(1, timestamp, 10)],
      [adjustment(1, timestamp, 200)],
    )

    expect(result.remainingWeightGrams).toBe(190)
  })

  it('uses the lexicographically greatest adjustment ID for same-time measurements', () => {
    const timestamp = '2025-01-03T00:00:00.000Z'
    const result = calculate(
      250,
      [brew(1, timestamp, 5)],
      [
        adjustment(1, timestamp, 200),
        adjustment(2, timestamp, 180),
      ],
    )

    expect(result.remainingWeightGrams).toBe(175)
    expect(result.remainingWeightAdjustmentId).toBe(
      '70000000-0000-4000-8000-000000000002',
    )
  })

  it('recalculates after historical brews are edited or deleted', () => {
    const checkpoint = adjustment(
      1,
      '2025-01-03T00:00:00.000Z',
      200,
    )
    const beforeCheckpoint = brew(1, '2025-01-02T00:00:00.000Z', 30)
    const firstAfterCheckpoint = brew(2, '2025-01-04T00:00:00.000Z', 15)
    const secondAfterCheckpoint = brew(3, '2025-01-05T00:00:00.000Z', 10)

    expect(
      calculate(250, [beforeCheckpoint, firstAfterCheckpoint, secondAfterCheckpoint], [
        checkpoint,
      ]).remainingWeightGrams,
    ).toBe(175)
    expect(
      calculate(
        250,
        [
          beforeCheckpoint,
          { ...firstAfterCheckpoint, coffeeDoseGrams: 20 },
          secondAfterCheckpoint,
        ],
        [checkpoint],
      ).remainingWeightGrams,
    ).toBe(170)
    expect(
      calculate(250, [beforeCheckpoint, firstAfterCheckpoint], [checkpoint])
        .remainingWeightGrams,
    ).toBe(185)
  })

  it('accepts zero and rejects invalid or negative calculated remaining weight', () => {
    expect(calculate(10, [brew(1, '2025-01-02T00:00:00.000Z', 10)]))
      .toMatchObject({ remainingWeightGrams: 0 })
    expect(() =>
      calculate(10, [brew(1, '2025-01-02T00:00:00.000Z', 11)]),
    ).toThrow(RangeError)
    expect(() => calculate(-1)).toThrow()
    expect(() =>
      calculate(10, [brew(1, '2025-01-02T00:00:00.000Z', -1)]),
    ).toThrow()
  })

  it('rejects records belonging to another bag', () => {
    expect(() =>
      calculate(250, [
        brew(1, '2025-01-02T00:00:00.000Z', 10, {
          myCoffeeId: UUIDSchema.parse(
            '10000000-0000-4000-8000-000000000002',
          ),
        }),
      ]),
    ).toThrow(/different coffee bag/)
  })

  it('keeps finished state independent from remaining weight', () => {
    const bag = MyCoffeeSchema.parse({
      id: myCoffeeId,
      createdAt,
      updatedAt: createdAt,
      productId: UUIDSchema.parse(
        '20000000-0000-4000-8000-000000000001',
      ),
      purchasePriceToman: 0,
      packageWeightGrams: 10,
      purchaseDate: '2025-01-01',
      isFinished: false,
    })
    const weight = calculate(10, [
      brew(1, '2025-01-02T00:00:00.000Z', 10),
    ])

    expect(weight.remainingWeightGrams).toBe(0)
    expect(bag.isFinished).toBe(false)
  })
})
