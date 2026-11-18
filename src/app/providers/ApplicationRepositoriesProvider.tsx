import type { ReactNode } from 'react'
import {
  ApplicationRepositoriesContext,
  type ApplicationRepositories,
} from './ApplicationRepositoriesContext'

type RepositoryRuntime = {
  db: (typeof import('@/lib/db'))['db']
  repositories: typeof import('@/lib/repositories')
}

let repositoryRuntime: Promise<RepositoryRuntime> | undefined

function loadRepositoryRuntime(): Promise<RepositoryRuntime> {
  if (!repositoryRuntime) {
    repositoryRuntime = Promise.all([
      import('@/lib/db'),
      import('@/lib/repositories'),
    ]).then(([databaseModule, repositories]) => ({
      db: databaseModule.db,
      repositories,
    })).then(async (runtime) => {
      await runtime.repositories.initializeReferenceData(runtime.db)
      return runtime
    })
  }
  return repositoryRuntime
}

const applicationRepositories: ApplicationRepositories = {
  listReferenceData: async () => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.listReferenceData(db)
  },
  createCustomReference: async (category, name, parentId) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.createCustomReference(db, category, name, parentId)
  },
  listCoffeeCatalog: async () => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.listCoffeeCatalog(db)
  },
  createCatalogCoffee: async (input) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.createCoffee(db, input)
  },
  listMyCoffeeCollection: async () => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.listMyCoffeeCollection(db)
  },
  createMyCoffeeRecord: async (input) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.createMyCoffeeRecord(db, input)
  },
  updateMyCoffeeStatus: async (id, status) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.updateMyCoffeeStatus(db, id, status)
  },
  listMyCoffees: async () => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.listMyCoffees(db)
  },
  getMyCoffee: async (id) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.getMyCoffee(db, id)
  },
  createMyCoffee: async (input) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.createMyCoffee(db, input)
  },
  updateMyCoffee: async (id, updates) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.updateMyCoffee(db, id, updates)
  },
  markMyCoffeeFinished: async (id, isFinished) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.markMyCoffeeFinished(db, id, isFinished)
  },
  deleteMyCoffee: async (id) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.deleteMyCoffee(db, id)
  },
  listProducts: async () => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.listProducts(db)
  },
  getProduct: async (id) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.getProduct(db, id)
  },
  getImageAsset: async (id) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.getImageAsset(db, id)
  },
  listBrewsForMyCoffee: async (myCoffeeId) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.listBrewsForMyCoffee(db, myCoffeeId)
  },
  createBrew: async (input) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.createBrew(db, input)
  },
  updateBrew: async (id, updates) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.updateBrew(db, id, updates)
  },
  deleteBrew: async (id) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.deleteBrew(db, id)
  },
  listWeightAdjustmentsForMyCoffee: async (myCoffeeId) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.listWeightAdjustmentsForMyCoffee(db, myCoffeeId)
  },
  recordWeightAdjustment: async (input) => {
    const { db, repositories } = await loadRepositoryRuntime()
    return repositories.recordWeightAdjustment(db, input)
  },
}

interface ApplicationRepositoriesProviderProps {
  children: ReactNode
}

export function ApplicationRepositoriesProvider({
  children,
}: ApplicationRepositoriesProviderProps) {
  return (
    <ApplicationRepositoriesContext.Provider value={applicationRepositories}>
      {children}
    </ApplicationRepositoriesContext.Provider>
  )
}
