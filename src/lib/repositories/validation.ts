import { UUIDSchema } from '@/domain/shared'
import type { UUID } from '@/domain/shared'

export function parseRepositoryId(id: UUID): UUID {
  return UUIDSchema.parse(id)
}
