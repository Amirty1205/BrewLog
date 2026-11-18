import Dexie, { type Table } from 'dexie'
import type { Brew, WeightAdjustment } from '@/domain/brew'
import type {
  Coffee as CoffeeCatalogEntry,
  MyCoffee as MyCoffeeCollectionEntry,
} from '@/domain/coffee-records'
import type {
  CoffeeVarietyReference,
  FlavorDescriptorReference,
  FlavorFamilyReference,
  OriginReference,
  ProcessingMethodReference,
  RoasteryReference,
} from '@/domain/reference-data'
import type {
  CoffeeSource,
  MyCoffee,
  Product,
  ProductSource,
  Roastery,
} from '@/domain/coffee'
import type { ImageAsset } from '@/domain/image'
import type { UUID } from '@/domain/shared'
import type { LegacyBrewRecord, LegacyCoffeeRecord } from '@/types/database'
import { migrateCoffeeCatalogToReferences } from './reference-data/migration'

const legacyStores = {
  coffees: 'id, createdAt, updatedAt',
  brews: 'id, coffeeId, createdAt, updatedAt',
}

const domainStores = {
  coffeeSources:
    'id, name, country, region, producer, harvestYear, *varieties, createdAt, updatedAt',
  roasteries: 'id, name, logoImageId, createdAt, updatedAt',
  products: 'id, roasteryId, name, roastLevel, imageId, createdAt, updatedAt',
  productSources:
    'id, productId, coffeeSourceId, &[productId+coffeeSourceId]',
  myCoffees:
    'id, productId, purchaseDate, roastDate, isFinished, [productId+isFinished], createdAt, updatedAt',
  brewRecords: 'id, myCoffeeId, brewedAt, createdAt, updatedAt',
  weightAdjustments: 'id, myCoffeeId, measuredAt, createdAt, updatedAt',
  imageAssets: 'id, mimeType, createdAt, updatedAt',
}

const collectionStores = {
  coffeeCatalog:
    'id, name, roastery, origin, region, farm, *variety, *processes, altitudeMin, altitudeMax, roastLevel, createdAt, updatedAt',
  myCoffeeCollection:
    'id, coffeeId, purchaseDate, price, currency, quantity, status, [coffeeId+status], createdAt, updatedAt',
}

const referenceStores = {
  referenceRoasteries: 'id, &normalizedName, source',
  originReferences:
    'id, kind, parentId, &normalizedKey, source, [kind+parentId]',
  coffeeVarieties: 'id, &normalizedName, source',
  processingMethods: 'id, &normalizedName, source',
  flavorFamilies: 'id, &normalizedName, source',
  flavorDescriptors: 'id, familyId, &[familyId+normalizedName], source',
}

const referencedCoffeeStore = {
  coffeeCatalog:
    'id, name, roasteryId, originCountryId, originRegionId, originFarmId, *varietyIds, *processIds, *flavorDescriptorIds, altitudeMin, altitudeMax, roastLevel, createdAt, updatedAt',
}

export class BrewlogDatabase extends Dexie {
  // These v1 tables are retained unchanged so existing records are not dropped.
  coffees!: Table<LegacyCoffeeRecord, string>
  brews!: Table<LegacyBrewRecord, string>
  coffeeSources!: Table<CoffeeSource, UUID>
  roasteries!: Table<Roastery, UUID>
  products!: Table<Product, UUID>
  productSources!: Table<ProductSource, UUID>
  myCoffees!: Table<MyCoffee, UUID>
  brewRecords!: Table<Brew, UUID>
  weightAdjustments!: Table<WeightAdjustment, UUID>
  imageAssets!: Table<ImageAsset, UUID>
  coffeeCatalog!: Table<CoffeeCatalogEntry, UUID>
  myCoffeeCollection!: Table<MyCoffeeCollectionEntry, UUID>
  referenceRoasteries!: Table<RoasteryReference, UUID>
  originReferences!: Table<OriginReference, UUID>
  coffeeVarieties!: Table<CoffeeVarietyReference, UUID>
  processingMethods!: Table<ProcessingMethodReference, UUID>
  flavorFamilies!: Table<FlavorFamilyReference, UUID>
  flavorDescriptors!: Table<FlavorDescriptorReference, UUID>

  constructor(databaseName = 'Brewlog') {
    super(databaseName)
    this.version(1).stores(legacyStores)
    this.version(2).stores({
      ...legacyStores,
      ...domainStores,
    })
    this.version(3).stores({
      ...legacyStores,
      ...domainStores,
      ...collectionStores,
    })
    this.version(4)
      .stores({
        ...legacyStores,
        ...domainStores,
        ...collectionStores,
        ...referenceStores,
        ...referencedCoffeeStore,
      })
      .upgrade(migrateCoffeeCatalogToReferences)
  }
}

export const db = new BrewlogDatabase()
