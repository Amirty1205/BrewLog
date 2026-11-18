import { z } from 'zod'
import {
  EntitySchema,
  NonEmptyTextSchema,
  NonNegativeNumberSchema,
  OptionalTextSchema,
  PersonalRatingSchema,
  UUIDSchema,
} from './shared'

export const BrewSchema = EntitySchema.extend({
  myCoffeeId: UUIDSchema,
  brewMethod: NonEmptyTextSchema,
  coffeeDoseGrams: NonNegativeNumberSchema,
  waterAmountGrams: NonNegativeNumberSchema,
  temperatureCelsius: NonNegativeNumberSchema,
  grindInformation: OptionalTextSchema,
  brewDurationSeconds: NonNegativeNumberSchema,
  personalTastingNotes: OptionalTextSchema,
  personalBrewRating: PersonalRatingSchema.optional(),
  brewedAt: z.iso.datetime(),
}).strict()

export type Brew = z.infer<typeof BrewSchema>
export type BrewInput = z.input<typeof BrewSchema>

export const BrewUpdateSchema = BrewSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
  .partial()
  .strict()

export type BrewUpdateInput = z.input<typeof BrewUpdateSchema>

export const WeightAdjustmentSchema = EntitySchema.extend({
  myCoffeeId: UUIDSchema,
  measuredRemainingWeightGrams: NonNegativeNumberSchema,
  measuredAt: z.iso.datetime(),
  note: OptionalTextSchema,
}).strict()

export type WeightAdjustment = z.infer<typeof WeightAdjustmentSchema>
export type WeightAdjustmentInput = z.input<typeof WeightAdjustmentSchema>
