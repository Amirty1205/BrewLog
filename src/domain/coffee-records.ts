import { z } from 'zod'
import { UUIDSchema } from './shared'

const NonEmptyTextSchema = z.string().trim().min(1)
const OptionalTextSchema = NonEmptyTextSchema.optional()
const NonNegativeNumberSchema = z.number().finite().nonnegative()
const UniqueReferenceIdsSchema = z
  .array(UUIDSchema)
  .default([])
  .refine((ids) => new Set(ids).size === ids.length)
const EntitySchema = z
  .object({
    id: UUIDSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .strict()

export const CoffeeSchema = EntitySchema.extend({
  name: NonEmptyTextSchema,
  roasteryId: UUIDSchema.optional(),
  originCountryId: UUIDSchema.optional(),
  originRegionId: UUIDSchema.optional(),
  originFarmId: UUIDSchema.optional(),
  varietyIds: UniqueReferenceIdsSchema,
  processIds: UniqueReferenceIdsSchema,
  flavorDescriptorIds: UniqueReferenceIdsSchema,
  altitudeMin: NonNegativeNumberSchema.optional(),
  altitudeMax: NonNegativeNumberSchema.optional(),
  roastLevel: z.enum(['light', 'medium', 'dark', 'unknown']).optional(),
  description: OptionalTextSchema,
})
  .strict()
  .superRefine((coffee, context) => {
    if (
      coffee.altitudeMin !== undefined &&
      coffee.altitudeMax !== undefined &&
      coffee.altitudeMin > coffee.altitudeMax
    ) {
      context.addIssue({
        code: 'custom',
        path: ['altitudeMax'],
        message: 'Maximum altitude must not be below minimum altitude.',
      })
    }
  })

export type Coffee = z.infer<typeof CoffeeSchema>
export type CoffeeInput = z.input<typeof CoffeeSchema>

export const MyCoffeeSchema = EntitySchema.extend({
  coffeeId: UUIDSchema,
  purchaseDate: z.date().optional(),
  price: NonNegativeNumberSchema.optional(),
  currency: OptionalTextSchema,
  quantity: NonNegativeNumberSchema.optional(),
  status: z.enum(['active', 'finished']),
  personalNotes: OptionalTextSchema,
}).strict()

export type MyCoffee = z.infer<typeof MyCoffeeSchema>
export type MyCoffeeInput = z.input<typeof MyCoffeeSchema>
