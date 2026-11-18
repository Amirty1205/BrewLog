import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  DomainError,
  DuplicateRecordError,
  InvalidOperationError,
  InvalidReferenceError,
  MissingRecordError,
  ReferencedRecordError,
} from '@/lib/domain-errors'
import { presentError } from './errorPresentation'

describe('error presentation', () => {
  it('maps every known domain error code without exposing its message', () => {
    const cases = [
      [new MissingRecordError('Product', 'private-id'), 'errorNotFound'],
      [new DuplicateRecordError('Product', 'private-id'), 'errorAlreadyExists'],
      [
        new InvalidReferenceError('Product', 'private-id'),
        'errorInvalidReference',
      ],
      [
        new ReferencedRecordError('Product', 'private-id', 'MyCoffee'),
        'errorReferencedRecord',
      ],
      [
        new InvalidOperationError('private implementation detail'),
        'errorInvalidOperation',
      ],
      [new DomainError('INVALID_OPERATION', 'private detail'), 'errorInvalidOperation'],
    ] as const

    for (const [error, messageKey] of cases) {
      const presentation = presentError(error)
      expect(presentation.messageKey).toBe(messageKey)
      expect(JSON.stringify(presentation)).not.toContain('private')
    }
  })

  it('keeps Zod issue paths and maps issue kinds to safe localized keys', () => {
    const result = z
      .object({ coffeeDoseGrams: z.number().min(1) })
      .safeParse({ coffeeDoseGrams: 0 })
    if (result.success) {
      throw new Error('Expected the test value to fail validation.')
    }

    expect(presentError(result.error)).toEqual({
      messageKey: 'errorValidation',
      validationIssues: [
        {
          path: ['coffeeDoseGrams'],
          messageKey: 'validationTooSmall',
          constraint: 1,
        },
      ],
    })
  })

  it('uses a safe generic message for unknown errors', () => {
    expect(presentError(new Error('database connection string'))).toEqual({
      messageKey: 'errorGeneric',
    })
  })
})
