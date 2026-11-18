import { createContext, useContext } from 'react'
import type {
  Brew,
  BrewInput,
  BrewUpdateInput,
  WeightAdjustment,
  WeightAdjustmentInput,
} from '@/domain/brew'
import type {
  MyCoffee,
  MyCoffeeDetailsUpdateInput,
  MyCoffeePurchaseInput,
  Product,
} from '@/domain/coffee'
import type {
  Coffee as CoffeeCatalogEntry,
  CoffeeInput,
  MyCoffee as MyCoffeeCollectionEntry,
  MyCoffeeInput,
} from '@/domain/coffee-records'
import type {
  CustomReferenceCategory,
  ReferenceDataSnapshot,
  ReferenceEntry,
} from '@/domain/reference-data'
import type { ImageAsset } from '@/domain/image'
import type { UUID } from '@/domain/shared'
import type { ProductWithRelationships } from '@/lib/repositories'

export interface ApplicationRepositories {
  listReferenceData: () => Promise<ReferenceDataSnapshot>
  createCustomReference: (
    category: CustomReferenceCategory,
    name: string,
    parentId?: UUID,
  ) => Promise<ReferenceEntry>
  listCoffeeCatalog: () => Promise<CoffeeCatalogEntry[]>
  createCatalogCoffee: (input: CoffeeInput) => Promise<CoffeeCatalogEntry>
  listMyCoffeeCollection: () => Promise<MyCoffeeCollectionEntry[]>
  createMyCoffeeRecord: (
    input: MyCoffeeInput,
  ) => Promise<MyCoffeeCollectionEntry>
  updateMyCoffeeStatus: (
    id: UUID,
    status: MyCoffeeCollectionEntry['status'],
  ) => Promise<MyCoffeeCollectionEntry>
  listMyCoffees: () => Promise<MyCoffee[]>
  getMyCoffee: (id: UUID) => Promise<MyCoffee>
  createMyCoffee: (input: MyCoffeePurchaseInput) => Promise<MyCoffee>
  updateMyCoffee: (
    id: UUID,
    updates: MyCoffeeDetailsUpdateInput,
  ) => Promise<MyCoffee>
  markMyCoffeeFinished: (id: UUID, isFinished: boolean) => Promise<MyCoffee>
  deleteMyCoffee: (id: UUID) => Promise<void>
  listProducts: () => Promise<Product[]>
  getProduct: (id: UUID) => Promise<ProductWithRelationships>
  getImageAsset: (id: UUID) => Promise<ImageAsset>
  listBrewsForMyCoffee: (myCoffeeId: UUID) => Promise<Brew[]>
  createBrew: (input: BrewInput) => Promise<Brew>
  updateBrew: (id: UUID, updates: BrewUpdateInput) => Promise<Brew>
  deleteBrew: (id: UUID) => Promise<void>
  listWeightAdjustmentsForMyCoffee: (
    myCoffeeId: UUID,
  ) => Promise<WeightAdjustment[]>
  recordWeightAdjustment: (
    input: WeightAdjustmentInput,
  ) => Promise<MyCoffee>
}

const ApplicationRepositoriesContext =
  createContext<ApplicationRepositories | null>(null)

export function useApplicationRepositories(): ApplicationRepositories {
  const repositories = useContext(ApplicationRepositoriesContext)
  if (!repositories) {
    throw new Error(
      'Application APIs must be used within ApplicationRepositoriesProvider.',
    )
  }
  return repositories
}

export { ApplicationRepositoriesContext }
