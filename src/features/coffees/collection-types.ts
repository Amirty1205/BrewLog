import type { Coffee, MyCoffee } from '@/domain/coffee-records'
import type {
  CoffeeVarietyReference,
  FlavorDescriptorReference,
  FlavorFamilyReference,
  OriginReference,
  ProcessingMethodReference,
  RoasteryReference,
} from '@/domain/reference-data'

export interface ResolvedCoffee extends Coffee {
  roastery?: RoasteryReference
  originCountry?: OriginReference
  originRegion?: OriginReference
  originFarm?: OriginReference
  varieties: CoffeeVarietyReference[]
  processes: ProcessingMethodReference[]
  flavors: Array<{
    family: FlavorFamilyReference
    descriptor: FlavorDescriptorReference
  }>
}

export interface MyCoffeeCollectionItem {
  myCoffee: MyCoffee
  coffee: ResolvedCoffee
}
