import { describe, expect, it } from 'vitest'
import { BrewlogDatabase } from '../db'
import { InvalidOperationError } from '../domain-errors'
import { initializeReferenceData } from '../reference-data/seed'
import {
  createCustomReference,
  listOriginChildren,
  listReferenceData,
} from './reference-data'

function testDatabase() {
  return new BrewlogDatabase(`Brewlog-reference-data-${crypto.randomUUID()}`)
}

describe('Reference data repositories', () => {
  it('seeds idempotently and preserves custom entries', async () => {
    const database = testDatabase()
    try {
      await database.open()
      await initializeReferenceData(database)
      const initial = await listReferenceData(database)
      const custom = await createCustomReference(
        database,
        'variety',
        'Yellow Bourbon',
      )

      await initializeReferenceData(database)
      const seededAgain = await listReferenceData(database)

      expect(seededAgain.varieties).toHaveLength(initial.varieties.length + 1)
      expect(
        seededAgain.varieties.find((entry) => entry.id === custom.id),
      ).toEqual(custom)
      expect(seededAgain.origins).toEqual(initial.origins)
      expect(seededAgain.flavorDescriptors).toEqual(initial.flavorDescriptors)
      expect(seededAgain.roasteries).toEqual([])
      expect(seededAgain.origins.filter(({ kind }) => kind === 'country'))
        .toHaveLength(22)
      expect(seededAgain.flavorDescriptors).toHaveLength(35)
    } finally {
      await database.delete()
    }
  })

  it('reuses custom entries with case- and whitespace-insensitive names', async () => {
    const database = testDatabase()
    try {
      await database.open()
      await initializeReferenceData(database)

      const first = await createCustomReference(
        database,
        'roastery',
        'Northstar Roastery',
      )
      const duplicate = await createCustomReference(
        database,
        'roastery',
        '  NORTHSTAR   ROASTERY ',
      )
      const seeded = await createCustomReference(
        database,
        'process',
        'natural',
      )
      const natural = (await listReferenceData(database)).processingMethods.find(
        (entry) => entry.name === 'Natural',
      )

      expect(duplicate.id).toBe(first.id)
      expect(seeded.id).toBe(natural?.id)
      expect(seeded.source).toBe('system')
      expect(await database.referenceRoasteries.count()).toBe(1)
    } finally {
      await database.delete()
    }
  })

  it('creates origin children within their hierarchy and rejects invalid parents', async () => {
    const database = testDatabase()
    try {
      await database.open()
      await initializeReferenceData(database)
      const countries = (await listReferenceData(database)).origins.filter(
        (origin) => origin.kind === 'country',
      )
      const ethiopia = countries.find((origin) => origin.name === 'Ethiopia')!
      const colombia = countries.find((origin) => origin.name === 'Colombia')!
      const region = await createCustomReference(
        database,
        'region',
        'Sidama',
        ethiopia.id,
      )
      const sameNameOtherCountry = await createCustomReference(
        database,
        'region',
        'Sidama',
        colombia.id,
      )
      const farm = await createCustomReference(
        database,
        'farm',
        'Aster Farm',
        region.id,
      )

      expect(await listOriginChildren(database, 'region', ethiopia.id)).toEqual([
        region,
      ])
      expect(
        await listOriginChildren(database, 'region', colombia.id),
      ).toEqual([sameNameOtherCountry])
      expect(await listOriginChildren(database, 'farm', region.id)).toEqual([
        farm,
      ])
      await expect(
        createCustomReference(database, 'region', 'Invalid region', region.id),
      ).rejects.toBeInstanceOf(InvalidOperationError)
    } finally {
      await database.delete()
    }
  })

  it('creates and reuses custom flavor families and descriptors', async () => {
    const database = testDatabase()
    try {
      await database.open()
      await initializeReferenceData(database)
      const family = await createCustomReference(
        database,
        'flavor-family',
        'Savory',
      )
      const descriptor = await createCustomReference(
        database,
        'flavor-descriptor',
        'Olive',
        family.id,
      )
      const duplicate = await createCustomReference(
        database,
        'flavor-descriptor',
        'OLIVE',
        family.id,
      )

      expect(duplicate.id).toBe(descriptor.id)
      expect(descriptor).toMatchObject({
        familyId: family.id,
        source: 'custom',
        name: 'Olive',
      })
    } finally {
      await database.delete()
    }
  })
})
