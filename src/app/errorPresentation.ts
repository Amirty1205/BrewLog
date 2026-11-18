import { ZodError } from 'zod'
import type { ZodIssue } from 'zod'
import type { TranslationKey } from './providers/LanguageContext'
import { DomainError } from '@/lib/domain-errors'
import type { DomainErrorCode } from '@/lib/domain-errors'

export interface PresentedValidationIssue {
  path: string[]
  messageKey: TranslationKey
  constraint?: number | string
}

export interface ErrorPresentation {
  messageKey: TranslationKey
  validationIssues?: PresentedValidationIssue[]
}

const domainErrorMessageKeys: Record<DomainErrorCode, TranslationKey> = {
  NOT_FOUND: 'errorNotFound',
  ALREADY_EXISTS: 'errorAlreadyExists',
  INVALID_REFERENCE: 'errorInvalidReference',
  REFERENCED_RECORD: 'errorReferencedRecord',
  INVALID_OPERATION: 'errorInvalidOperation',
}

function validationMessageKey(code: ZodIssue['code']): TranslationKey {
  switch (code) {
    case 'invalid_type':
      return 'validationInvalidType'
    case 'invalid_format':
      return 'validationInvalidFormat'
    case 'too_small':
      return 'validationTooSmall'
    case 'too_big':
      return 'validationTooBig'
    default:
      return 'validationInvalidValue'
  }
}

export function presentError(error: unknown): ErrorPresentation {
  if (error instanceof DomainError) {
    return {
      messageKey: domainErrorMessageKeys[error.code],
    }
  }

  if (error instanceof ZodError) {
    return {
      messageKey: 'errorValidation',
      validationIssues: error.issues.map((issue) => {
        let constraint: number | string | undefined
        if (issue.code === 'too_small') {
          constraint =
            typeof issue.minimum === 'bigint'
              ? issue.minimum.toString()
              : issue.minimum
        } else if (issue.code === 'too_big') {
          constraint =
            typeof issue.maximum === 'bigint'
              ? issue.maximum.toString()
              : issue.maximum
        }

        return {
          path: issue.path.map(String),
          messageKey: validationMessageKey(issue.code),
          ...(constraint === undefined ? {} : { constraint }),
        }
      }),
    }
  }

  return { messageKey: 'errorGeneric' }
}
