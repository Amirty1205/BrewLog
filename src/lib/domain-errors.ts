export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'INVALID_REFERENCE'
  | 'REFERENCED_RECORD'
  | 'INVALID_OPERATION'

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(
    code: DomainErrorCode,
    message: string,
  ) {
    super(message)
    this.code = code
    this.name = 'DomainError'
  }
}

export class MissingRecordError extends DomainError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} ${id} was not found.`)
    this.name = 'MissingRecordError'
  }
}

export class DuplicateRecordError extends DomainError {
  constructor(entity: string, id: string) {
    super('ALREADY_EXISTS', `${entity} ${id} already exists.`)
    this.name = 'DuplicateRecordError'
  }
}

export class InvalidReferenceError extends DomainError {
  constructor(reference: string, id: string) {
    super('INVALID_REFERENCE', `Referenced ${reference} ${id} was not found.`)
    this.name = 'InvalidReferenceError'
  }
}

export class ReferencedRecordError extends DomainError {
  constructor(entity: string, id: string, reference: string) {
    super(
      'REFERENCED_RECORD',
      `Cannot delete ${entity} ${id}; it is referenced by ${reference}.`,
    )
    this.name = 'ReferencedRecordError'
  }
}

export class InvalidOperationError extends DomainError {
  constructor(message: string) {
    super('INVALID_OPERATION', message)
    this.name = 'InvalidOperationError'
  }
}

