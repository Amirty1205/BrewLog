import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BrewInput, BrewUpdateInput, WeightAdjustmentInput } from '@/domain/brew'
import type { UUID } from '@/domain/shared'
import { createRecordMetadata } from '@/app/recordMetadata'
import { queryKeys } from '@/app/queryKeys'
import { useApplicationRepositories } from '@/app/providers/ApplicationRepositoriesContext'

type NewBrew = Omit<BrewInput, 'id' | 'createdAt' | 'updatedAt'>
type NewWeightAdjustment = Omit<
  WeightAdjustmentInput,
  'id' | 'createdAt' | 'updatedAt'
>

function invalidateBrewEffects(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.brews.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.myCoffees.all }),
  ])
}

export function useBrews(myCoffeeId: UUID) {
  const repositories = useApplicationRepositories()
  return useQuery({
    queryKey: queryKeys.brews.byMyCoffee(myCoffeeId),
    queryFn: () => repositories.listBrewsForMyCoffee(myCoffeeId),
  })
}

export function useWeightAdjustments(myCoffeeId: UUID) {
  const repositories = useApplicationRepositories()
  return useQuery({
    queryKey: queryKeys.weightAdjustments.byMyCoffee(myCoffeeId),
    queryFn: () =>
      repositories.listWeightAdjustmentsForMyCoffee(myCoffeeId),
  })
}

export function useCreateBrew() {
  const repositories = useApplicationRepositories()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: NewBrew) =>
      repositories.createBrew({ ...input, ...createRecordMetadata() }),
    onSuccess: () => invalidateBrewEffects(queryClient),
  })
}

export function useUpdateBrew() {
  const repositories = useApplicationRepositories()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: UUID
      updates: BrewUpdateInput
    }) => repositories.updateBrew(id, updates),
    onSuccess: () => invalidateBrewEffects(queryClient),
  })
}

export function useDeleteBrew() {
  const repositories = useApplicationRepositories()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: UUID) => repositories.deleteBrew(id),
    onSuccess: () => invalidateBrewEffects(queryClient),
  })
}

export function useRecordWeightAdjustment() {
  const repositories = useApplicationRepositories()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: NewWeightAdjustment) =>
      repositories.recordWeightAdjustment({
        ...input,
        ...createRecordMetadata(),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.myCoffees.all,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.weightAdjustments.all,
        }),
      ])
    },
  })
}
