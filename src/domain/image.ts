import { z } from 'zod'
import { EntitySchema, NonEmptyTextSchema } from './shared'

export const ImageAssetSchema = EntitySchema.extend({
  mimeType: NonEmptyTextSchema,
  blob: z.instanceof(Blob),
}).strict()

export type ImageAsset = z.infer<typeof ImageAssetSchema>
export type ImageAssetInput = z.input<typeof ImageAssetSchema>
