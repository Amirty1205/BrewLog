import { describe, expect, it } from 'vitest'
import { UUIDSchema } from '@/domain/shared'
import {
  createRecordMetadata,
  createUtcTimestamp,
  createUUID,
} from './recordMetadata'

describe('record metadata utilities', () => {
  it('generates UUID-compatible identifiers', () => {
    const id = createUUID()

    expect(UUIDSchema.parse(id)).toBe(id)
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('generates UTC ISO timestamps', () => {
    const timestamp = createUtcTimestamp()

    expect(new Date(timestamp).toISOString()).toBe(timestamp)
    expect(timestamp).toMatch(/Z$/)
  })

  it('uses one timestamp for the creation and update metadata', () => {
    const metadata = createRecordMetadata()

    expect(UUIDSchema.parse(metadata.id)).toBe(metadata.id)
    expect(metadata.createdAt).toBe(metadata.updatedAt)
    expect(new Date(metadata.createdAt).toISOString()).toBe(metadata.createdAt)
  })
})
