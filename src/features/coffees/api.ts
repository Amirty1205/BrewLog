import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  MyCoffee,
  MyCoffeeDetailsUpdateInput,
  MyCoffeePurchaseInput,
} from '@/domain/coffee'
import type { ImageAsset } from '@/domain/image'
import type { UUID } from '@/domain/shared'
import { InvalidReferenceError } from '@/lib/domain-errors'
import { createRecordMetadata } from '@/app/recordMetadata'
import { queryKeys } from '@/app/queryKeys'
import { useApplicationRepositories } from '@/app/providers/ApplicationRepositoriesContext'
import type { ApplicationRepositories } from '@/app/providers/ApplicationRepositoriesContext'
import type {
  MyCoffeeDetail,
  MyCoffeeListItem,
  MyCoffeeProductImage,
} from './viewModels'

type MyCoffeeReadRepositories = Pick<
  ApplicationRepositories,
  | 'listMyCoffees'
  | 'getMyCoffee'
  | 'getProduct'
  | 'getImageAsset'
  | 'listWeightAdjustmentsForMyCoffee'
>

type ProductRelationships = Awaited<
  ReturnType<ApplicationRepositories['getProduct']>
>

interface ProductWithImage extends ProductRelationships {
  productImage?: MyCoffeeProductImage
}

function toProductImage(image: ImageAsset): MyCoffeeProductImage {
  return {
    id: image.id,
    mimeType: image.mimeType,
    blob: image.blob,
  }
}

async function getProductWithImage(
  repositories: MyCoffeeReadRepositories,
  productId: UUID,
): Promise<ProductWithImage> {
  const relationships = await repositories.getProduct(productId)
  if (!relationships.product.imageId) {
    return relationships
  }

  const image = await repositories.getImageAsset(relationships.product.imageId)
  return { ...relationships, productImage: toProductImage(image) }
}

function toListItem(
  myCoffee: MyCoffee,
  productDetails: ProductWithImage,
): MyCoffeeListItem {
  const { product, roastery, sources, productImage } = productDetails

  return {
    myCoffee: {
      id: myCoffee.id,
      productId: myCoffee.productId,
      purchaseDate: myCoffee.purchaseDate,
      purchasePriceToman: myCoffee.purchasePriceToman,
      packageWeightGrams: myCoffee.packageWeightGrams,
      remainingWeightGrams: myCoffee.remainingWeightGrams,
      remainingWeightStatus: myCoffee.remainingWeightStatus,
      ...(myCoffee.personalCoffeeRating === undefined
        ? {}
        : { personalCoffeeRating: myCoffee.personalCoffeeRating }),
      isFinished: myCoffee.isFinished,
    },
    product: {
      id: product.id,
      name: product.name,
      ...(product.roastLevel === undefined
        ? {}
        : { roastLevel: product.roastLevel }),
      ...(product.roasterCuppingScore === undefined
        ? {}
        : { roasterCuppingScore: product.roasterCuppingScore }),
    },
    roastery: {
      id: roastery.id,
      name: roastery.name,
    },
    sources: sources.map(({ link, coffeeSource }) => ({
      link: {
        id: link.id,
        ...(link.blendProportionPercent === undefined
          ? {}
          : { blendProportionPercent: link.blendProportionPercent }),
      },
      coffeeSource: {
        id: coffeeSource.id,
        name: coffeeSource.name,
        ...(coffeeSource.country === undefined
          ? {}
          : { country: coffeeSource.country }),
        ...(coffeeSource.region === undefined
          ? {}
          : { region: coffeeSource.region }),
        ...(coffeeSource.farm === undefined
          ? {}
          : { farm: coffeeSource.farm }),
        ...(coffeeSource.producer === undefined
          ? {}
          : { producer: coffeeSource.producer }),
      },
    })),
    ...(productImage ? { productImage } : {}),
  }
}

function comparePurchaseDates(left: MyCoffee, right: MyCoffee): number {
  const purchaseDateOrder = right.purchaseDate.localeCompare(
    left.purchaseDate,
  )
  if (purchaseDateOrder !== 0) return purchaseDateOrder

  return (
    right.createdAt.localeCompare(left.createdAt) ||
    right.id.localeCompare(left.id)
  )
}

export async function loadMyCoffeeList(
  repositories: MyCoffeeReadRepositories,
): Promise<MyCoffeeListItem[]> {
  const bags = [...(await repositories.listMyCoffees())].sort(
    comparePurchaseDates,
  )
  const productIds = [...new Set(bags.map((bag) => bag.productId))]
  const productEntries = await Promise.all(
    productIds.map(async (productId) => [
      productId,
      await getProductWithImage(repositories, productId),
    ] as const),
  )
  const productsById = new Map(productEntries)

  return bags.map((bag) => {
    const productDetails = productsById.get(bag.productId)
    if (!productDetails) {
      throw new InvalidReferenceError('product', bag.productId)
    }
    return toListItem(bag, productDetails)
  })
}

export async function loadMyCoffeeDetail(
  repositories: MyCoffeeReadRepositories,
  id: UUID,
): Promise<MyCoffeeDetail> {
  const myCoffee = await repositories.getMyCoffee(id)
  const [productDetails, weightAdjustments] = await Promise.all([
    getProductWithImage(repositories, myCoffee.productId),
    repositories.listWeightAdjustmentsForMyCoffee(myCoffee.id),
  ])
  const listItem = toListItem(myCoffee, productDetails)

  return {
    ...listItem,
    myCoffee,
    product: productDetails.product,
    roastery: productDetails.roastery,
    sources: productDetails.sources,
    weightAdjustments,
  }
}

type NewMyCoffee = Omit<
  MyCoffeePurchaseInput,
  'id' | 'createdAt' | 'updatedAt'
>

export function useMyCoffees() {
  const repositories = useApplicationRepositories()
  return useQuery({
    queryKey: queryKeys.myCoffees.list(),
    queryFn: () => loadMyCoffeeList(repositories),
  })
}

export function useMyCoffee(id: UUID) {
  const repositories = useApplicationRepositories()
  return useQuery({
    queryKey: queryKeys.myCoffees.detail(id),
    queryFn: () => loadMyCoffeeDetail(repositories, id),
  })
}

export function useProducts() {
  const repositories = useApplicationRepositories()
  return useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: () => repositories.listProducts(),
  })
}

export function useProduct(id: UUID) {
  const repositories = useApplicationRepositories()
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => repositories.getProduct(id),
  })
}

export function useCreateMyCoffee() {
  const repositories = useApplicationRepositories()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (purchase: NewMyCoffee) =>
      repositories.createMyCoffee({
        ...purchase,
        ...createRecordMetadata(),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.myCoffees.all }),
  })
}

export function useUpdateMyCoffee() {
  const repositories = useApplicationRepositories()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: UUID
      updates: MyCoffeeDetailsUpdateInput
    }) => repositories.updateMyCoffee(id, updates),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.myCoffees.all }),
  })
}

export function useMarkMyCoffeeFinished() {
  const repositories = useApplicationRepositories()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isFinished }: { id: UUID; isFinished: boolean }) =>
      repositories.markMyCoffeeFinished(id, isFinished),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.myCoffees.all }),
  })
}

export function useDeleteMyCoffee() {
  const repositories = useApplicationRepositories()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: UUID) => repositories.deleteMyCoffee(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myCoffees.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.brews.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.weightAdjustments.all,
        }),
      ])
    },
  })
}
