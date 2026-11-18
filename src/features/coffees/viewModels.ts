import type { WeightAdjustment } from '@/domain/brew'
import type {
  CoffeeSource,
  MyCoffee,
  Product,
  ProductSource,
  Roastery,
} from '@/domain/coffee'
import type { ImageAsset } from '@/domain/image'

export type MyCoffeeListBag = Pick<
  MyCoffee,
  | 'id'
  | 'productId'
  | 'purchaseDate'
  | 'purchasePriceToman'
  | 'packageWeightGrams'
  | 'remainingWeightGrams'
  | 'remainingWeightStatus'
  | 'personalCoffeeRating'
  | 'isFinished'
>

export type MyCoffeeProductImage = Pick<ImageAsset, 'id' | 'mimeType' | 'blob'>

export interface MyCoffeeSourceSummary {
  link: Pick<ProductSource, 'id' | 'blendProportionPercent'>
  coffeeSource: Pick<
    CoffeeSource,
    'id' | 'name' | 'country' | 'region' | 'farm' | 'producer'
  >
}

export interface MyCoffeeListItem {
  myCoffee: MyCoffeeListBag
  product: Pick<Product, 'id' | 'name' | 'roastLevel' | 'roasterCuppingScore'>
  roastery: Pick<Roastery, 'id' | 'name'>
  sources: MyCoffeeSourceSummary[]
  productImage?: MyCoffeeProductImage
}

export interface MyCoffeeDetail extends MyCoffeeListItem {
  myCoffee: MyCoffee
  product: Product
  roastery: Roastery
  sources: Array<{
    link: ProductSource
    coffeeSource: CoffeeSource
  }>
  weightAdjustments: WeightAdjustment[]
}
