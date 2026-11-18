import { z } from 'zod'

export const UUIDSchema = z.string().uuid().brand<'UUID'>()
export type UUID = z.infer<typeof UUIDSchema>

export function createUUID(): UUID {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi) {
    throw new Error('A secure browser random number generator is required.')
  }

  if (typeof cryptoApi.randomUUID === 'function') {
    return UUIDSchema.parse(cryptoApi.randomUUID())
  }

  if (typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('A secure browser random number generator is required.')
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  const value = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')

  return UUIDSchema.parse(value)
}

export const ISODateSchema = z.iso.date()
export const TimestampSchema = z.iso.datetime()
export const NonEmptyTextSchema = z.string().trim().min(1)
export const OptionalTextSchema = NonEmptyTextSchema.optional()
export const NonNegativeNumberSchema = z.number().finite().nonnegative()
export const PersonalRatingSchema = z.number().int().min(1).max(10)

export const EntitySchema = z
  .object({
    id: UUIDSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict()

export type Entity = z.infer<typeof EntitySchema>
