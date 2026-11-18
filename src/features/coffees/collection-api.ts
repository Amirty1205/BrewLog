import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CoffeeSchema,
  MyCoffeeSchema,
} from '@/domain/coffee-records'
import type {
  Coffee,
  CoffeeInput,
  MyCoffee,
  MyCoffeeInput,
} from '@/domain/coffee-records'
import { createUUID, type UUID } from '@/domain/shared'
import { InvalidReferenceError } from '@/lib/domain-errors'
import { queryKeys } from '@/app/queryKeys'
import { useApplicationRepositories } from '@/app/providers/ApplicationRepositoriesContext'
import type { ApplicationRepositories } from '@/app/providers/ApplicationRepositoriesContext'
import type { MyCoffeeCollectionItem } from './collection-types'

export interface CoffeeFormValues {
  name: string
  roasteryId: UUID | ''
  originCountryId: UUID | ''
  originRegionId: UUID | ''
  originFarmId: UUID | ''
  varietyIds: UUID[]
  processIds: UUID[]
  flavorDescriptorIds: UUID[]
  altitudeMin: string
  altitudeMax: string
  roastLevel: '' | 'light' | 'medium' | 'dark' | 'unknown'
  description: string
}

export interface PurchaseFormValues {
  purchaseDate: string
  price: string
  currency: string
  quantity: string
  personalNotes: string
}

type CoffeeCollectionRepositories = Pick<
  ApplicationRepositories,
  'listCoffeeCatalog' | 'listMyCoffeeCollection' | 'listReferenceData'
>

type AddCoffeeRepositories = Pick<
  ApplicationRepositories,
  'createCatalogCoffee' | 'createMyCoffeeRecord'
>

function requiredReference<T>(
  references: Map<UUID, T>,
  id: UUID,
  entity: string,
): T {
  const reference = references.get(id)
  if (!reference) throw new InvalidReferenceError(entity, id)
  return reference
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return Number.NaN
  return parsed
}

function createDateMetadata() {
  const now = new Date()
  return { id: createUUID(), createdAt: now, updatedAt: now }
}

export async function loadMyCoffeeCollection(
  repositories: CoffeeCollectionRepositories,
): Promise<MyCoffeeCollectionItem[]> {
  const [purchases, coffees, referenceData] = await Promise.all([
    repositories.listMyCoffeeCollection(),
    repositories.listCoffeeCatalog(),
    repositories.listReferenceData(),
  ])
  const coffeesById = new Map(coffees.map((coffee) => [coffee.id, coffee]))
  const roasteries = new Map(
    referenceData.roasteries.map((reference) => [reference.id, reference]),
  )
  const origins = new Map(
    referenceData.origins.map((reference) => [reference.id, reference]),
  )
  const varieties = new Map(
    referenceData.varieties.map((reference) => [reference.id, reference]),
  )
  const processingMethods = new Map(
    referenceData.processingMethods.map((reference) => [
      reference.id,
      reference,
    ]),
  )
  const flavorDescriptors = new Map(
    referenceData.flavorDescriptors.map((reference) => [
      reference.id,
      reference,
    ]),
  )
  const flavorFamilies = new Map(
    referenceData.flavorFamilies.map((reference) => [reference.id, reference]),
  )

  return purchases
    .map((myCoffee) => {
      const coffee = coffeesById.get(myCoffee.coffeeId)
      if (!coffee) {
        throw new InvalidReferenceError('coffee', myCoffee.coffeeId)
      }
      const getOrigin = (id: UUID | undefined) => {
        if (!id) return undefined
        return requiredReference(origins, id, 'origin')
      }
      const roastery = coffee.roasteryId
        ? requiredReference(roasteries, coffee.roasteryId, 'roastery')
        : undefined
      const resolvedFlavors = coffee.flavorDescriptorIds.map((id) => {
        const descriptor = requiredReference(flavorDescriptors, id, 'flavor')
        const family = requiredReference(
          flavorFamilies,
          descriptor.familyId,
          'flavor family',
        )
        return { descriptor, family }
      })
      const resolvedCoffee = {
        ...coffee,
        ...(roastery ? { roastery } : {}),
        ...(coffee.originCountryId
          ? { originCountry: getOrigin(coffee.originCountryId) }
          : {}),
        ...(coffee.originRegionId
          ? { originRegion: getOrigin(coffee.originRegionId) }
          : {}),
        ...(coffee.originFarmId
          ? { originFarm: getOrigin(coffee.originFarmId) }
          : {}),
        varieties: coffee.varietyIds.map((id) => {
          return requiredReference(varieties, id, 'variety')
        }),
        processes: coffee.processIds.map((id) => {
          return requiredReference(processingMethods, id, 'process')
        }),
        flavors: resolvedFlavors,
      }
      return { myCoffee, coffee: resolvedCoffee }
    })
    .sort((left, right) => {
      const purchaseDateOrder =
        (right.myCoffee.purchaseDate?.getTime() ?? 0) -
        (left.myCoffee.purchaseDate?.getTime() ?? 0)
      return (
        purchaseDateOrder ||
        right.myCoffee.createdAt.getTime() -
          left.myCoffee.createdAt.getTime() ||
        right.myCoffee.id.localeCompare(left.myCoffee.id)
      )
    })
}

export async function createCatalogCoffeeFromForm(
  repositories: Pick<AddCoffeeRepositories, 'createCatalogCoffee'>,
  values: CoffeeFormValues,
): Promise<Coffee> {
  const input: CoffeeInput = CoffeeSchema.parse({
    ...createDateMetadata(),
    name: values.name,
    ...(values.roasteryId ? { roasteryId: values.roasteryId } : {}),
    ...(values.originCountryId
      ? { originCountryId: values.originCountryId }
      : {}),
    ...(values.originRegionId
      ? { originRegionId: values.originRegionId }
      : {}),
    ...(values.originFarmId ? { originFarmId: values.originFarmId } : {}),
    varietyIds: values.varietyIds,
    processIds: values.processIds,
    flavorDescriptorIds: values.flavorDescriptorIds,
    ...(values.altitudeMin.trim()
      ? { altitudeMin: optionalNumber(values.altitudeMin) }
      : {}),
    ...(values.altitudeMax.trim()
      ? { altitudeMax: optionalNumber(values.altitudeMax) }
      : {}),
    ...(values.roastLevel ? { roastLevel: values.roastLevel } : {}),
    ...(optionalText(values.description)
      ? { description: optionalText(values.description) }
      : {}),
  })
  return repositories.createCatalogCoffee(input)
}

function parsePurchaseDate(value: string): Date | undefined {
  return value ? new Date(`${value}T00:00:00.000Z`) : undefined
}

export async function addMyCoffeeToCollection(
  repositories: Pick<AddCoffeeRepositories, 'createMyCoffeeRecord'>,
  coffeeId: UUID,
  values: PurchaseFormValues,
): Promise<MyCoffee> {
  const input: MyCoffeeInput = MyCoffeeSchema.parse({
    ...createDateMetadata(),
    coffeeId,
    ...(values.purchaseDate
      ? { purchaseDate: parsePurchaseDate(values.purchaseDate) }
      : {}),
    ...(values.price.trim()
      ? { price: optionalNumber(values.price) }
      : {}),
    ...(optionalText(values.currency)
      ? { currency: optionalText(values.currency) }
      : {}),
    ...(values.quantity.trim()
      ? { quantity: optionalNumber(values.quantity) }
      : {}),
    status: 'active',
    ...(optionalText(values.personalNotes)
      ? { personalNotes: optionalText(values.personalNotes) }
      : {}),
  })
  return repositories.createMyCoffeeRecord(input)
}

export function useCoffeeCatalog() {
  const repositories = useApplicationRepositories()
  return useQuery({
    queryKey: queryKeys.coffeeCatalog.list(),
    queryFn: () => repositories.listCoffeeCatalog(),
  })
}

export function useReferenceData() {
  const repositories = useApplicationRepositories()
  return useQuery({
    queryKey: queryKeys.referenceData.snapshot(),
    queryFn: () => repositories.listReferenceData(),
  })
}

export function useCreateCustomReference() {
  const repositories = useApplicationRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      category,
      name,
      parentId,
    }: {
      category: Parameters<
        ApplicationRepositories['createCustomReference']
      >[0]
      name: string
      parentId?: UUID
    }) => repositories.createCustomReference(category, name, parentId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.referenceData.all,
      }),
  })
}

export function useMyCoffeeCollection() {
  const repositories = useApplicationRepositories()
  return useQuery({
    queryKey: queryKeys.myCoffeeCollection.list(),
    queryFn: () => loadMyCoffeeCollection(repositories),
  })
}

export function useCreateCatalogCoffee() {
  const repositories = useApplicationRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CoffeeFormValues) =>
      createCatalogCoffeeFromForm(repositories, values),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.coffeeCatalog.all }),
  })
}

export function useAddMyCoffeeToCollection() {
  const repositories = useApplicationRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      coffeeId,
      values,
    }: {
      coffeeId: UUID
      values: PurchaseFormValues
    }) => addMyCoffeeToCollection(repositories, coffeeId, values),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.myCoffeeCollection.all,
      }),
  })
}

export function useUpdateMyCoffeeCollectionStatus() {
  const repositories = useApplicationRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: UUID
      status: MyCoffee['status']
    }) => repositories.updateMyCoffeeStatus(id, status),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.myCoffeeCollection.all,
      }),
  })
}
