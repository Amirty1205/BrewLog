import { describe, expect, it } from 'vitest'
import { UUIDSchema } from '@/domain/shared'
import { BrewlogDatabase } from '../db'
import { InvalidReferenceError, MissingRecordError } from '../domain-errors'
import {
  createCoffee,
  createMyCoffeeRecord,
  getCoffee,
  getMyCoffeeRecord,
  listMyCoffeeCollection,
  updateCoffee,
  updateMyCoffeeStatus,
} from './coffee-records'

function testDatabase() {
  return new BrewlogDatabase(`Brewlog-coffee-records-${crypto.randomUUID()}`)
}

const coffeeId = UUIDSchema.parse('10000000-0000-4000-8000-000000000001')
const myCoffeeId = UUIDSchema.parse('20000000-0000-4000-8000-000000000001')
const timestamp = new Date('2025-01-01T00:00:00.000Z')

describe('Coffee record repositories', () => {
  it('creates, retrieves, updates coffee and maintains Date metadata', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const coffee = await createCoffee(database, {
        id: coffeeId,
        name: 'Citrus Lot',
        processIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      })

      expect(await getCoffee(database, coffeeId)).toEqual(coffee)
      const updated = await updateCoffee(database, coffeeId, {
        ...coffee,
        description: 'Stone fruit and citrus.',
      })
      expect(updated.description).toBe('Stone fruit and citrus.')
      expect(updated.createdAt).toEqual(timestamp)
      expect(updated.updatedAt).toBeInstanceOf(Date)
    } finally {
      await database.delete()
    }
  })

  it('creates a coffee collection entry, lists it, and updates its status', async () => {
    const database = testDatabase()
    try {
      await database.open()
      await createCoffee(database, {
        id: coffeeId,
        name: 'Citrus Lot',
        processIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      const created = await createMyCoffeeRecord(database, {
        id: myCoffeeId,
        coffeeId,
        purchaseDate: new Date('2025-02-01T00:00:00.000Z'),
        price: 15,
        currency: 'USD',
        quantity: 250,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      })

      expect(await getMyCoffeeRecord(database, myCoffeeId)).toEqual(created)
      expect(await listMyCoffeeCollection(database)).toEqual([created])
      const finished = await updateMyCoffeeStatus(
        database,
        myCoffeeId,
        'finished',
      )
      expect(finished.status).toBe('finished')
      expect(finished.updatedAt).toBeInstanceOf(Date)
      expect(finished.createdAt).toEqual(timestamp)
    } finally {
      await database.delete()
    }
  })

  it('rejects invalid references and reports missing records', async () => {
    const database = testDatabase()
    try {
      await database.open()
      await expect(getCoffee(database, coffeeId)).rejects.toBeInstanceOf(
        MissingRecordError,
      )
      await expect(
        createMyCoffeeRecord(database, {
          id: myCoffeeId,
          coffeeId,
          status: 'active',
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      ).rejects.toBeInstanceOf(InvalidReferenceError)
    } finally {
      await database.delete()
    }
  })
})
