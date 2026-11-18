import { describe, expect, it } from 'vitest'
import { UUIDSchema } from '@/domain/shared'
import { BrewlogDatabase } from '@/lib/db'
import {
  createCustomReference,
  createCoffee,
  createMyCoffeeRecord,
  listCoffeeCatalog,
  listMyCoffeeCollection,
  listReferenceData,
  initializeReferenceData,
  updateMyCoffeeStatus,
} from '@/lib/repositories'
import {
  addMyCoffeeToCollection,
  createCatalogCoffeeFromForm,
  loadMyCoffeeCollection,
} from './collection-api'

function testDatabase() {
  return new BrewlogDatabase(`Brewlog-coffee-page-${crypto.randomUUID()}`)
}

const existingCoffeeId = UUIDSchema.parse(
  '10000000-0000-4000-8000-000000000001',
)
const timestamp = new Date('2025-01-01T00:00:00.000Z')

describe('My Coffees collection workflows', () => {
  it('adds multiple personal purchases that reference one existing catalog coffee', async () => {
    const database = testDatabase()
    try {
      await database.open()
      const coffee = await createCoffee(database, {
        id: existingCoffeeId,
        name: 'Citrus Lot',
        processIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      const first = await addMyCoffeeToCollection(
        {
          createMyCoffeeRecord: (input) =>
            createMyCoffeeRecord(database, input),
        },
        coffee.id,
        { purchaseDate: '2025-02-01', price: '18', currency: 'USD', quantity: '250', personalNotes: 'Bright cup' },
      )
      const second = await addMyCoffeeToCollection(
        {
          createMyCoffeeRecord: (input) =>
            createMyCoffeeRecord(database, input),
        },
        coffee.id,
        { purchaseDate: '', price: '', currency: '', quantity: '', personalNotes: '' },
      )

      expect(first.coffeeId).toBe(coffee.id)
      expect(first.status).toBe('active')
      expect(first.purchaseDate).toEqual(
        new Date('2025-02-01T00:00:00.000Z'),
      )
      expect(second.coffeeId).toBe(coffee.id)
      expect(await database.coffeeCatalog.count()).toBe(1)
      expect(await database.myCoffeeCollection.count()).toBe(2)
    } finally {
      await database.delete()
    }
  })

  it('creates a new catalog coffee from form values before adding the purchase', async () => {
    const database = testDatabase()
    try {
      await database.open()
      await initializeReferenceData(database)
      const references = await listReferenceData(database)
      const country = references.origins.find(
        (origin) => origin.kind === 'country' && origin.name === 'Ethiopia',
      )!
      const variety = references.varieties.find(
        (item) => item.name === 'Heirloom',
      )!
      const process = references.processingMethods.find(
        (item) => item.name === 'Natural',
      )!
      const family = references.flavorFamilies.find(
        (item) => item.name === 'Fruity',
      )!
      const flavor = references.flavorDescriptors.find(
        (item) => item.name === 'Mango' && item.familyId === family.id,
      )!
      const customProcess = await createCustomReference(
        database,
        'process',
        'Custom fermentation',
      )
      const coffee = await createCatalogCoffeeFromForm(
        {
          createCatalogCoffee: (input) => createCoffee(database, input),
        },
        {
          name: 'Experimental Lot',
          roasteryId: '',
          originCountryId: country.id,
          originRegionId: '',
          originFarmId: '',
          varietyIds: [variety.id],
          processIds: [process.id, customProcess.id],
          flavorDescriptorIds: [flavor.id],
          altitudeMin: '1800',
          altitudeMax: '2200',
          roastLevel: 'light',
          description: 'Small seasonal lot.',
        },
      )
      const myCoffee = await addMyCoffeeToCollection(
        {
          createMyCoffeeRecord: (input) =>
            createMyCoffeeRecord(database, input),
        },
        coffee.id,
        { purchaseDate: '', price: '', currency: '', quantity: '', personalNotes: '' },
      )

      expect(coffee.varietyIds).toEqual([variety.id])
      expect(coffee.processIds).toEqual([process.id, customProcess.id])
      expect(coffee.flavorDescriptorIds).toEqual([flavor.id])
      expect(coffee.altitudeMin).toBe(1800)
      expect(myCoffee.coffeeId).toBe(coffee.id)
      expect((await loadMyCoffeeCollection({
        listCoffeeCatalog: () => listCoffeeCatalog(database),
        listMyCoffeeCollection: () => listMyCoffeeCollection(database),
        listReferenceData: () => listReferenceData(database),
      })).map((entry) => entry.coffee.name)).toEqual(['Experimental Lot'])
    } finally {
      await database.delete()
    }
  })

  it('rejects invalid new coffee details and can change status in both directions', async () => {
    const database = testDatabase()
    try {
      await database.open()
      await expect(
        createCatalogCoffeeFromForm(
          {
            createCatalogCoffee: (input) => createCoffee(database, input),
          },
          {
            name: 'Invalid Altitude',
            roasteryId: '',
            originCountryId: '',
            originRegionId: '',
            originFarmId: '',
            varietyIds: [],
            processIds: [],
            flavorDescriptorIds: [],
            altitudeMin: '2200',
            altitudeMax: '1800',
            roastLevel: '',
            description: '',
          },
        ),
      ).rejects.toThrow()
      expect(await database.coffeeCatalog.count()).toBe(0)

      const coffee = await createCoffee(database, {
        id: existingCoffeeId,
        name: 'Status Coffee',
        processIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      const purchase = await addMyCoffeeToCollection(
        {
          createMyCoffeeRecord: (input) =>
            createMyCoffeeRecord(database, input),
        },
        coffee.id,
        { purchaseDate: '', price: '', currency: '', quantity: '', personalNotes: '' },
      )

      const finished = await updateMyCoffeeStatus(
        database,
        purchase.id,
        'finished',
      )
      const active = await updateMyCoffeeStatus(
        database,
        purchase.id,
        'active',
      )
      expect(finished.status).toBe('finished')
      expect(active.status).toBe('active')
    } finally {
      await database.delete()
    }
  })
})
