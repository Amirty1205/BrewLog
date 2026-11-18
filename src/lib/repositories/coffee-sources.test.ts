import { describe, expect, it } from 'vitest'
import { UUIDSchema } from '@/domain/shared'
import { BrewlogDatabase } from '../db'
import {
  DuplicateRecordError,
  MissingRecordError,
  ReferencedRecordError,
} from '../domain-errors'
import {
  createCoffeeSource,
  deleteCoffeeSource,
  getCoffeeSource,
  listCoffeeSources,
  updateCoffeeSource,
} from './coffee-sources'
import { coffeeSource, seedProduct } from '@/test/repository-fixtures'

function testDatabase() {
  return new BrewlogDatabase(`Brewlog-sources-${crypto.randomUUID()}`)
}

describe('CoffeeSource repository', () => {
  it('creates, retrieves, lists, updates, and deletes a source', async () => {
    const database = testDatabase()
    const source = coffeeSource()
    try {
      await database.open()
      expect(await createCoffeeSource(database, source)).toEqual(source)
      expect(await getCoffeeSource(database, source.id)).toEqual(source)
      expect(await listCoffeeSources(database)).toEqual([source])

      const updated = await updateCoffeeSource(database, source.id, {
        ...source,
        name: 'Updated source',
        createdAt: '2020-01-01T00:00:00.000Z',
      })
      expect(updated.name).toBe('Updated source')
      expect(updated.createdAt).toBe(source.createdAt)

      await deleteCoffeeSource(database, source.id)
      await expect(getCoffeeSource(database, source.id)).rejects.toBeInstanceOf(
        MissingRecordError,
      )
    } finally {
      await database.delete()
    }
  })

  it('reports duplicate, missing, and invalid records', async () => {
    const database = testDatabase()
    const source = coffeeSource()
    try {
      await database.open()
      await createCoffeeSource(database, source)

      await expect(createCoffeeSource(database, source)).rejects.toBeInstanceOf(
        DuplicateRecordError,
      )
      await expect(
        updateCoffeeSource(
          database,
          UUIDSchema.parse('30000000-0000-4000-8000-000000000099'),
          {
            ...source,
            id: UUIDSchema.parse(
              '30000000-0000-4000-8000-000000000099',
            ),
          },
        ),
      ).rejects.toBeInstanceOf(MissingRecordError)
      await expect(
        createCoffeeSource(database, { ...source, name: ' ' }),
      ).rejects.toThrow()
    } finally {
      await database.delete()
    }
  })

  it('prevents deleting a source referenced by a product', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const { source } = await seedProduct(database)

      await expect(deleteCoffeeSource(database, source.id)).rejects.toBeInstanceOf(
        ReferencedRecordError,
      )
      expect(await getCoffeeSource(database, source.id)).toEqual(source)
    } finally {
      await database.delete()
    }
  })
})
