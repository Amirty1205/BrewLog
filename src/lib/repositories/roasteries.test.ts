import { describe, expect, it } from 'vitest'
import { UUIDSchema } from '@/domain/shared'
import { BrewlogDatabase } from '../db'
import {
  DuplicateRecordError,
  MissingRecordError,
  ReferencedRecordError,
} from '../domain-errors'
import {
  createRoastery,
  deleteRoastery,
  getRoastery,
  listRoasteries,
  updateRoastery,
} from './roasteries'
import { roastery, seedProduct } from '@/test/repository-fixtures'

function testDatabase() {
  return new BrewlogDatabase(`Brewlog-roasteries-${crypto.randomUUID()}`)
}

describe('Roastery repository', () => {
  it('creates, retrieves, lists, updates, and deletes a roastery', async () => {
    const database = testDatabase()
    const record = roastery()
    try {
      await database.open()
      await createRoastery(database, record)
      expect(await getRoastery(database, record.id)).toEqual(record)
      expect(await listRoasteries(database)).toEqual([record])

      const updated = await updateRoastery(database, record.id, {
        ...record,
        name: 'Updated roastery',
        createdAt: '2020-01-01T00:00:00.000Z',
      })
      expect(updated.name).toBe('Updated roastery')
      expect(updated.createdAt).toBe(record.createdAt)

      await deleteRoastery(database, record.id)
      await expect(getRoastery(database, record.id)).rejects.toBeInstanceOf(
        MissingRecordError,
      )
    } finally {
      await database.delete()
    }
  })

  it('reports duplicate, missing, and invalid records', async () => {
    const database = testDatabase()
    const record = roastery()
    try {
      await database.open()
      await createRoastery(database, record)
      await expect(createRoastery(database, record)).rejects.toBeInstanceOf(
        DuplicateRecordError,
      )
      await expect(
        updateRoastery(
          database,
          UUIDSchema.parse('40000000-0000-4000-8000-000000000099'),
          {
            ...record,
            id: UUIDSchema.parse(
              '40000000-0000-4000-8000-000000000099',
            ),
          },
        ),
      ).rejects.toBeInstanceOf(MissingRecordError)
      await expect(
        updateRoastery(database, record.id, {
          ...record,
          website: 'javascript:alert(1)',
        }),
      ).rejects.toThrow()
    } finally {
      await database.delete()
    }
  })

  it('prevents deleting a referenced roastery without deleting its product', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const seeded = await seedProduct(database)

      await expect(
        deleteRoastery(database, seeded.roastery.id),
      ).rejects.toBeInstanceOf(ReferencedRecordError)
      expect(await getRoastery(database, seeded.roastery.id)).toEqual(
        seeded.roastery,
      )
      expect(await database.products.get(seeded.product.id)).toEqual(
        seeded.product,
      )
    } finally {
      await database.delete()
    }
  })
})
