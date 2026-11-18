import type { UUID } from '@/domain/shared'

export interface LegacyCoffeeRecord {
  id: string
  createdAt: string
  updatedAt: string
}

export interface LegacyCoffeeCatalogRecord {
  id: UUID
  name: string
  roastery?: string
  origin?: string
  region?: string
  farm?: string
  variety?: string[]
  processes: string[]
  altitudeMin?: number
  altitudeMax?: number
  roastLevel?: 'light' | 'medium' | 'dark' | 'unknown'
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface LegacyBrewRecord {
  id: string
  coffeeId: string
  createdAt: string
  updatedAt: string
}
