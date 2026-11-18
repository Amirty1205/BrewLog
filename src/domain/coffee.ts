import { z } from 'zod'
import {
  EntitySchema,
  NonEmptyTextSchema,
  NonNegativeNumberSchema,
  OptionalTextSchema,
  PersonalRatingSchema,
  UUIDSchema,
} from './shared'

export const CoffeeSourceSchema = EntitySchema.extend({
  name: NonEmptyTextSchema,
  country: OptionalTextSchema,
  region: OptionalTextSchema,
  farm: OptionalTextSchema,
  producer: OptionalTextSchema,
  washingStation: OptionalTextSchema,
  varieties: z.array(NonEmptyTextSchema).default([]),
  processingMethod: OptionalTextSchema,
  altitudeMinMeters: NonNegativeNumberSchema.optional(),
  altitudeMaxMeters: NonNegativeNumberSchema.optional(),
  harvestYear: z.number().int().positive().optional(),
  harvestSeason: OptionalTextSchema,
})
  .strict()
  .superRefine((source, context) => {
    if (
      source.altitudeMinMeters !== undefined &&
      source.altitudeMaxMeters !== undefined &&
      source.altitudeMinMeters > source.altitudeMaxMeters
    ) {
      context.addIssue({
        code: 'custom',
        path: ['altitudeMaxMeters'],
        message: 'Maximum altitude must not be below minimum altitude.',
      })
    }
  })

export type CoffeeSource = z.infer<typeof CoffeeSourceSchema>
export type CoffeeSourceInput = z.input<typeof CoffeeSourceSchema>

const WebsiteSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
    message: 'Website must use HTTP or HTTPS.',
  })

export const RoasterySchema = EntitySchema.extend({
  name: NonEmptyTextSchema,
  description: OptionalTextSchema,
  website: WebsiteSchema.optional(),
  logoImageId: UUIDSchema.optional(),
}).strict()

export type Roastery = z.infer<typeof RoasterySchema>
export type RoasteryInput = z.input<typeof RoasterySchema>

export const ProductSchema = EntitySchema.extend({
  name: NonEmptyTextSchema,
  roasteryId: UUIDSchema,
  roastLevel: OptionalTextSchema,
  roasterCuppingScore: NonNegativeNumberSchema.optional(),
  roasterTastingNotes: OptionalTextSchema,
  roasterDescription: OptionalTextSchema,
  imageId: UUIDSchema.optional(),
}).strict()

export type Product = z.infer<typeof ProductSchema>
export type ProductInput = z.input<typeof ProductSchema>

export const ProductSourceSchema = EntitySchema.extend({
  productId: UUIDSchema,
  coffeeSourceId: UUIDSchema,
  blendProportionPercent: z.number().finite().min(0).max(100).optional(),
}).strict()

export type ProductSource = z.infer<typeof ProductSourceSchema>
export type ProductSourceInput = z.input<typeof ProductSourceSchema>

export const ProductWithSourcesSchema = z
  .object({
    product: ProductSchema,
    sources: z.array(ProductSourceSchema).min(1, {
      message: 'A product must reference at least one coffee source.',
    }),
  })
  .strict()
  .superRefine(({ product, sources }, context) => {
    const sourceIds = new Set<string>()
    let allProportionsSpecified = true
    let totalProportion = 0

    sources.forEach((source, index) => {
      if (source.productId !== product.id) {
        context.addIssue({
          code: 'custom',
          path: ['sources', index, 'productId'],
          message: 'Every source link must reference this product.',
        })
      }

      if (sourceIds.has(source.coffeeSourceId)) {
        context.addIssue({
          code: 'custom',
          path: ['sources', index, 'coffeeSourceId'],
          message: 'A coffee source can only be linked once per product.',
        })
      }
      sourceIds.add(source.coffeeSourceId)

      if (source.blendProportionPercent === undefined) {
        allProportionsSpecified = false
      } else {
        totalProportion += source.blendProportionPercent
      }
    })

    if (
      allProportionsSpecified &&
      Math.abs(totalProportion - 100) > 1e-8
    ) {
      context.addIssue({
        code: 'custom',
        path: ['sources'],
        message: 'Specified blend proportions must total 100%.',
      })
    }
  })

export type ProductWithSources = z.infer<typeof ProductWithSourcesSchema>
export type ProductWithSourcesInput = z.input<typeof ProductWithSourcesSchema>

export const RemainingWeightStatusSchema = z.enum([
  'estimated',
  'manually-corrected',
])

const MyCoffeeFieldsSchema = EntitySchema.extend({
  productId: UUIDSchema,
  purchasePriceToman: z.number().int().nonnegative(),
  packageWeightGrams: NonNegativeNumberSchema,
  purchaseDate: z.iso.date(),
  roastDate: z.iso.date().optional(),
  remainingWeightGrams: NonNegativeNumberSchema.optional(),
  remainingWeightStatus: RemainingWeightStatusSchema.default('estimated'),
  remainingWeightAdjustmentId: UUIDSchema.optional(),
  personalCoffeeRating: PersonalRatingSchema.optional(),
  isFinished: z.boolean().default(false),
  preGround: z.boolean().default(false),
  intendedBrewMethod: OptionalTextSchema,
  originalRoasterGrindDescription: OptionalTextSchema,
}).strict()

type MyCoffeeGrindFields = {
  preGround: boolean
  intendedBrewMethod?: string
  originalRoasterGrindDescription?: string
}

function validateMyCoffeeGrindFields(
  bag: MyCoffeeGrindFields,
  context: z.RefinementCtx,
): void {
  if (!bag.preGround && bag.intendedBrewMethod !== undefined) {
    context.addIssue({
      code: 'custom',
      path: ['intendedBrewMethod'],
      message: 'Intended brew method is only valid for pre-ground coffee.',
    })
  }

  if (!bag.preGround && bag.originalRoasterGrindDescription !== undefined) {
    context.addIssue({
      code: 'custom',
      path: ['originalRoasterGrindDescription'],
      message: 'Roaster grind description is only valid for pre-ground coffee.',
    })
  }
}

const MyCoffeePurchaseFieldsSchema = MyCoffeeFieldsSchema.omit({
  remainingWeightGrams: true,
  remainingWeightStatus: true,
  remainingWeightAdjustmentId: true,
})

export const MyCoffeePurchaseSchema =
  MyCoffeePurchaseFieldsSchema.superRefine(validateMyCoffeeGrindFields)

const MyCoffeeDetailsUpdateObjectSchema =
  MyCoffeePurchaseFieldsSchema.pick({
    productId: true,
    purchasePriceToman: true,
    packageWeightGrams: true,
    purchaseDate: true,
    roastDate: true,
    personalCoffeeRating: true,
    isFinished: true,
    preGround: true,
    intendedBrewMethod: true,
    originalRoasterGrindDescription: true,
  })
    .partial()
    .extend({
      isFinished: MyCoffeePurchaseFieldsSchema.shape.isFinished
        .unwrap()
        .optional(),
      preGround: MyCoffeePurchaseFieldsSchema.shape.preGround
        .unwrap()
        .optional(),
      roastDate: MyCoffeePurchaseFieldsSchema.shape.roastDate
        .unwrap()
        .nullable()
        .optional()
        .transform((value) => value ?? undefined),
      personalCoffeeRating: MyCoffeePurchaseFieldsSchema.shape.personalCoffeeRating
        .unwrap()
        .nullable()
        .optional()
        .transform((value) => value ?? undefined),
      intendedBrewMethod: MyCoffeePurchaseFieldsSchema.shape.intendedBrewMethod
        .unwrap()
        .nullable()
        .optional()
        .transform((value) => value ?? undefined),
      originalRoasterGrindDescription:
        MyCoffeePurchaseFieldsSchema.shape.originalRoasterGrindDescription
          .unwrap()
          .nullable()
          .optional()
          .transform((value) => value ?? undefined),
    })
    .strict()

type MyCoffeeDetailsUpdateObjectInput = z.input<
  typeof MyCoffeeDetailsUpdateObjectSchema
>

function stripUndefinedUpdateFields(value: unknown): unknown {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return value
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    return value
  }

  const normalized: Record<string, unknown> = {}
  for (const [key, fieldValue] of Object.entries(value)) {
    if (fieldValue !== undefined) {
      normalized[key] = fieldValue
    }
  }
  return normalized
}

export const MyCoffeeDetailsUpdateSchema = z.preprocess<
  unknown,
  typeof MyCoffeeDetailsUpdateObjectSchema,
  MyCoffeeDetailsUpdateObjectInput
>(stripUndefinedUpdateFields, MyCoffeeDetailsUpdateObjectSchema)

export const MyCoffeeSchema = MyCoffeeFieldsSchema.superRefine(
  (bag, context) => {
    if (
      bag.remainingWeightStatus === 'manually-corrected' &&
      bag.remainingWeightAdjustmentId === undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: ['remainingWeightAdjustmentId'],
        message: 'A manually corrected weight must reference its checkpoint.',
      })
    }

    if (
      bag.remainingWeightStatus === 'estimated' &&
      bag.remainingWeightAdjustmentId !== undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: ['remainingWeightAdjustmentId'],
        message: 'An estimated weight cannot reference a manual checkpoint.',
      })
    }

    validateMyCoffeeGrindFields(bag, context)
  },
).transform((bag) => ({
    ...bag,
    remainingWeightGrams: bag.remainingWeightGrams ?? bag.packageWeightGrams,
  }))

export type MyCoffee = z.infer<typeof MyCoffeeSchema>
export type MyCoffeeInput = z.input<typeof MyCoffeeSchema>
export type MyCoffeePurchase = z.infer<typeof MyCoffeePurchaseSchema>
export type MyCoffeePurchaseInput = z.input<typeof MyCoffeePurchaseSchema>
export type MyCoffeeDetailsUpdateInput = z.input<
  typeof MyCoffeeDetailsUpdateSchema
>
