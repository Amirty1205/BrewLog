import { z } from 'zod'
import { NonEmptyTextSchema, UUIDSchema } from './shared'

export function normalizeReferenceName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

export const ReferenceSourceSchema = z.enum(['system', 'custom'])
export type ReferenceSource = z.infer<typeof ReferenceSourceSchema>

const ReferenceFieldsSchema = z.object({
  id: UUIDSchema,
  name: NonEmptyTextSchema,
  normalizedName: NonEmptyTextSchema,
  source: ReferenceSourceSchema,
  createdAt: z.date(),
})

export const RoasteryReferenceSchema = ReferenceFieldsSchema.strict()
export type RoasteryReference = z.infer<typeof RoasteryReferenceSchema>

export const OriginKindSchema = z.enum(['country', 'region', 'farm'])
export type OriginKind = z.infer<typeof OriginKindSchema>

export const OriginReferenceSchema = ReferenceFieldsSchema.extend({
  kind: OriginKindSchema,
  parentId: UUIDSchema.optional(),
  normalizedKey: NonEmptyTextSchema,
}).strict()
export type OriginReference = z.infer<typeof OriginReferenceSchema>

export const CoffeeVarietyReferenceSchema = ReferenceFieldsSchema.strict()
export type CoffeeVarietyReference = z.infer<typeof CoffeeVarietyReferenceSchema>

export const ProcessingMethodReferenceSchema =
  ReferenceFieldsSchema.strict()
export type ProcessingMethodReference = z.infer<
  typeof ProcessingMethodReferenceSchema
>

export const FlavorFamilyReferenceSchema = ReferenceFieldsSchema.strict()
export type FlavorFamilyReference = z.infer<
  typeof FlavorFamilyReferenceSchema
>

export const FlavorDescriptorReferenceSchema = ReferenceFieldsSchema.extend({
  familyId: UUIDSchema,
}).strict()
export type FlavorDescriptorReference = z.infer<
  typeof FlavorDescriptorReferenceSchema
>

export type ReferenceEntry =
  | RoasteryReference
  | OriginReference
  | CoffeeVarietyReference
  | ProcessingMethodReference
  | FlavorFamilyReference
  | FlavorDescriptorReference

export type CustomReferenceCategory =
  | 'roastery'
  | OriginKind
  | 'variety'
  | 'process'
  | 'flavor-family'
  | 'flavor-descriptor'

export interface ReferenceDataSnapshot {
  roasteries: RoasteryReference[]
  origins: OriginReference[]
  varieties: CoffeeVarietyReference[]
  processingMethods: ProcessingMethodReference[]
  flavorFamilies: FlavorFamilyReference[]
  flavorDescriptors: FlavorDescriptorReference[]
}
