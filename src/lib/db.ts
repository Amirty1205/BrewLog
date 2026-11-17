import Dexie, { type Table } from 'dexie'
import type { BrewRecord, CoffeeRecord } from '@/types/database'

class BrewlogDatabase extends Dexie {
  coffees!: Table<CoffeeRecord, string>
  brews!: Table<BrewRecord, string>

  constructor() {
    super('Brewlog')
    this.version(1).stores({
      coffees: 'id, createdAt, updatedAt',
      brews: 'id, coffeeId, createdAt, updatedAt',
    })
  }
}

export const db = new BrewlogDatabase()
