export interface CoffeeRecord {
  id: string
  createdAt: string
  updatedAt: string
}

export interface BrewRecord {
  id: string
  coffeeId: string
  createdAt: string
  updatedAt: string
}
