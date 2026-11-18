import { EntitySchema } from '@/domain/shared'
import { createUUID } from '@/domain/shared'
import type { Entity } from '@/domain/shared'

export { createUUID } from '@/domain/shared'

export type RecordMetadata = Pick<Entity, 'id' | 'createdAt' | 'updatedAt'>

export function createUtcTimestamp(): string {
  return new Date().toISOString()
}

export function createRecordMetadata(): RecordMetadata {
  const timestamp = createUtcTimestamp()
  return EntitySchema.pick({
    id: true,
    createdAt: true,
    updatedAt: true,
  }).parse({
    id: createUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
}
