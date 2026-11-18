import { describe, expect, it } from 'vitest'
import { CoffeeSchema, MyCoffeeSchema } from './coffee-records'
import { UUIDSchema } from './shared'

const createdAt = new Date('2025-01-01T00:00:00.000Z')

function entity(id: string) {
  return {
    id: UUIDSchema.parse(id),
    createdAt,
    updatedAt: createdAt,
  }
}

describe('CoffeeSchema', () => {
  it('accepts multiple reference IDs and Date timestamps', () => {
    const coffee = CoffeeSchema.parse({
      ...entity('10000000-0000-4000-8000-000000000001'),
      name: 'Citrus Lot',
      processIds: [
        UUIDSchema.parse('30000000-0000-4000-8000-000000000001'),
        UUIDSchema.parse('30000000-0000-4000-8000-000000000002'),
        UUIDSchema.parse('30000000-0000-4000-8000-000000000003'),
      ],
      altitudeMin: 1500,
      altitudeMax: 1900,
      roastLevel: 'light',
    })

    expect(coffee.processIds).toEqual([
      '30000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000003',
    ])
    expect(coffee.createdAt).toBeInstanceOf(Date)
    expect(
      CoffeeSchema.safeParse({ ...coffee, altitudeMin: 2000 }).success,
    ).toBe(false)
    expect(
      CoffeeSchema.safeParse({
        ...coffee,
        varietyIds: [coffee.processIds[0], coffee.processIds[0]],
      }).success,
    ).toBe(false)
  })
})

describe('MyCoffeeSchema', () => {
  it('validates purchase details and keeps coffee references separate', () => {
    const myCoffee = MyCoffeeSchema.parse({
      ...entity('20000000-0000-4000-8000-000000000001'),
      coffeeId: UUIDSchema.parse('10000000-0000-4000-8000-000000000001'),
      purchaseDate: new Date('2025-02-01T00:00:00.000Z'),
      price: 12.5,
      currency: 'USD',
      quantity: 250,
      status: 'active',
    })

    expect(myCoffee.coffeeId).toBe(
      '10000000-0000-4000-8000-000000000001',
    )
    expect(
      MyCoffeeSchema.safeParse({ ...myCoffee, price: -1 }).success,
    ).toBe(false)
    expect(
      MyCoffeeSchema.safeParse({
        ...myCoffee,
        purchaseDate: '2025-02-01',
      }).success,
    ).toBe(false)
  })
})
