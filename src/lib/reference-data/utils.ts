import type { OriginKind } from '@/domain/reference-data'
import { normalizeReferenceName } from '@/domain/reference-data'
import type { UUID } from '@/domain/shared'

export { normalizeReferenceName }

export function createOriginNormalizedKey(
  kind: OriginKind,
  normalizedName: string,
  parentId: UUID | undefined,
): string {
  return JSON.stringify([kind, parentId ?? '', normalizedName])
}
