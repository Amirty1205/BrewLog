import { z } from 'zod'
import { BrewSchema, WeightAdjustmentSchema } from './brew'
import type { Brew, WeightAdjustment } from './brew'
import { NonNegativeNumberSchema, UUIDSchema } from './shared'
import type { UUID } from './shared'

const WeightCalculationInputSchema = z
  .object({
    myCoffeeId: UUIDSchema,
    packageWeightGrams: NonNegativeNumberSchema,
  })
  .strict()
const WEIGHT_ROUNDING_TOLERANCE_GRAMS = 1e-8

export interface WeightCalculationInput {
  myCoffeeId: UUID
  packageWeightGrams: number
  brews: readonly Brew[]
  adjustments: readonly WeightAdjustment[]
}

export interface WeightCalculation {
  remainingWeightGrams: number
  remainingWeightStatus: 'estimated' | 'manually-corrected'
  remainingWeightAdjustmentId?: UUID
}

export function compareUtcTimestamps(left: string, right: string): number {
  const [leftWhole, leftFraction = ''] = left.slice(0, -1).split('.')
  const [rightWhole, rightFraction = ''] = right.slice(0, -1).split('.')

  if (leftWhole !== rightWhole) {
    return leftWhole < rightWhole ? -1 : 1
  }

  const fractionLength = Math.max(leftFraction.length, rightFraction.length)
  const normalizedLeft = leftFraction.padEnd(fractionLength, '0')
  const normalizedRight = rightFraction.padEnd(fractionLength, '0')

  if (normalizedLeft === normalizedRight) {
    return 0
  }
  return normalizedLeft < normalizedRight ? -1 : 1
}

function assertUniqueIds(
  records: readonly { id: UUID }[],
  recordType: string,
): void {
  const ids = new Set<UUID>()
  for (const record of records) {
    if (ids.has(record.id)) {
      throw new Error(`Duplicate ${recordType} ID: ${record.id}`)
    }
    ids.add(record.id)
  }
}

/**
 * Same-time adjustments are ordered by UUID; the lexicographically greatest
 * UUID is the final checkpoint. Same-time brews are then deducted from it.
 */
export function calculateRemainingWeight(
  input: WeightCalculationInput,
): WeightCalculation {
  const { myCoffeeId, packageWeightGrams } =
    WeightCalculationInputSchema.parse({
      myCoffeeId: input.myCoffeeId,
      packageWeightGrams: input.packageWeightGrams,
    })
  const brews = input.brews.map((brew) => BrewSchema.parse(brew))
  const adjustments = input.adjustments.map((adjustment) =>
    WeightAdjustmentSchema.parse(adjustment),
  )

  assertUniqueIds(brews, 'Brew')
  assertUniqueIds(adjustments, 'Weight adjustment')

  for (const brew of brews) {
    if (brew.myCoffeeId !== myCoffeeId) {
      throw new Error(`Brew ${brew.id} belongs to a different coffee bag.`)
    }
  }
  for (const adjustment of adjustments) {
    if (adjustment.myCoffeeId !== myCoffeeId) {
      throw new Error(
        `Weight adjustment ${adjustment.id} belongs to a different coffee bag.`,
      )
    }
  }

  const latestAdjustment = adjustments.reduce<WeightAdjustment | undefined>(
    (latest, candidate) => {
      if (!latest) {
        return candidate
      }

      const timeOrder = compareUtcTimestamps(
        candidate.measuredAt,
        latest.measuredAt,
      )
      if (
        timeOrder > 0 ||
        (timeOrder === 0 && candidate.id > latest.id)
      ) {
        return candidate
      }
      return latest
    },
    undefined,
  )

  const baselineWeight =
    latestAdjustment?.measuredRemainingWeightGrams ?? packageWeightGrams
  const applicableBrews = latestAdjustment
    ? brews.filter(
        (brew) =>
          compareUtcTimestamps(brew.brewedAt, latestAdjustment.measuredAt) >= 0,
      )
    : brews
  const remainingWeightGrams =
    baselineWeight -
    applicableBrews.reduce((total, brew) => total + brew.coffeeDoseGrams, 0)

  if (remainingWeightGrams < -WEIGHT_ROUNDING_TOLERANCE_GRAMS) {
    throw new RangeError(
      'Brew doses exceed the remaining weight at the latest baseline.',
    )
  }

  // Clamp only floating-point noise; meaningful deficits are rejected above.
  return {
    remainingWeightGrams: Math.max(0, remainingWeightGrams),
    remainingWeightStatus: latestAdjustment
      ? 'manually-corrected'
      : 'estimated',
    ...(latestAdjustment
      ? { remainingWeightAdjustmentId: latestAdjustment.id }
      : {}),
  }
}
