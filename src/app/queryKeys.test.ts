import { describe, expect, it } from 'vitest'
import { UUIDSchema } from '@/domain/shared'
import { queryKeys } from './queryKeys'

const id = UUIDSchema.parse('10000000-0000-4000-8000-000000000001')

describe('query keys', () => {
  it('groups My Coffee and Product list and detail keys beneath their roots', () => {
    expect(queryKeys.myCoffees.list()).toEqual(['my-coffees', 'list'])
    expect(queryKeys.myCoffees.details()).toEqual([
      'my-coffees',
      'detail',
    ])
    expect(queryKeys.myCoffees.detail(id)).toEqual([
      ...queryKeys.myCoffees.details(),
      id,
    ])

    expect(queryKeys.products.list()).toEqual(['products', 'list'])
    expect(queryKeys.products.detail(id)).toEqual([
      ...queryKeys.products.details(),
      id,
    ])
  })

  it('groups per-bag Brew and adjustment keys beneath their collection roots', () => {
    expect(queryKeys.brews.byMyCoffee(id)).toEqual([
      ...queryKeys.brews.all,
      'my-coffee',
      id,
    ])
    expect(queryKeys.weightAdjustments.byMyCoffee(id)).toEqual([
      ...queryKeys.weightAdjustments.all,
      'my-coffee',
      id,
    ])
  })

  it('provides hierarchical list and detail keys for catalog records', () => {
    expect(queryKeys.coffeeSources.list()).toEqual([
      ...queryKeys.coffeeSources.all,
      'list',
    ])
    expect(queryKeys.coffeeSources.detail(id)).toEqual([
      ...queryKeys.coffeeSources.details(),
      id,
    ])
    expect(queryKeys.roasteries.list()).toEqual([
      ...queryKeys.roasteries.all,
      'list',
    ])
    expect(queryKeys.roasteries.detail(id)).toEqual([
      ...queryKeys.roasteries.details(),
      id,
    ])
  })
})
