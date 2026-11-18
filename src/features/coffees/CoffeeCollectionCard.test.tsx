import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import en from '@/locales/en'
import { LanguageContext } from '@/app/providers/LanguageContext'
import { CoffeeSchema, MyCoffeeSchema } from '@/domain/coffee-records'
import { UUIDSchema } from '@/domain/shared'
import { CoffeeCollectionCard } from './CoffeeCollectionCard'

const createdAt = new Date('2025-01-01T00:00:00.000Z')

function item(status: 'active' | 'finished' = 'active') {
  const coffee = CoffeeSchema.parse({
    id: UUIDSchema.parse('10000000-0000-4000-8000-000000000001'),
    name: 'Citrus Lot',
    roasteryId: UUIDSchema.parse('30000000-0000-4000-8000-000000000001'),
    originCountryId: UUIDSchema.parse('40000000-0000-4000-8000-000000000001'),
    originRegionId: UUIDSchema.parse('40000000-0000-4000-8000-000000000002'),
    processIds: [
      UUIDSchema.parse('50000000-0000-4000-8000-000000000001'),
      UUIDSchema.parse('50000000-0000-4000-8000-000000000002'),
    ],
    roastLevel: 'light',
    createdAt,
    updatedAt: createdAt,
  })
  const resolvedCoffee = {
    ...coffee,
    roastery: {
      id: coffee.roasteryId!,
      name: 'Northstar Roastery',
      normalizedName: 'northstar roastery',
      source: 'custom' as const,
      createdAt,
    },
    originCountry: {
      id: coffee.originCountryId!,
      name: 'Ethiopia',
      normalizedName: 'ethiopia',
      normalizedKey: 'country:ethiopia',
      kind: 'country' as const,
      source: 'system' as const,
      createdAt,
    },
    originRegion: {
      id: coffee.originRegionId!,
      name: 'Yirgacheffe',
      normalizedName: 'yirgacheffe',
      normalizedKey: 'region:country:yirgacheffe',
      parentId: coffee.originCountryId!,
      kind: 'region' as const,
      source: 'custom' as const,
      createdAt,
    },
    varieties: [],
    processes: coffee.processIds.map((id, index) => ({
      id,
      name: index === 0 ? 'Washed' : 'Custom fermentation',
      normalizedName: index === 0 ? 'washed' : 'custom fermentation',
      source: 'custom' as const,
      createdAt,
    })),
    flavors: [],
  }
  const myCoffee = MyCoffeeSchema.parse({
    id: UUIDSchema.parse('20000000-0000-4000-8000-000000000001'),
    coffeeId: coffee.id,
    status,
    createdAt,
    updatedAt: createdAt,
  })
  return { coffee: resolvedCoffee, myCoffee }
}

function renderCard(status: 'active' | 'finished' = 'active') {
  return renderToStaticMarkup(
    <LanguageContext.Provider
      value={{
        language: 'en',
        setLanguage: () => {},
        t: (key) => en[key],
      }}
    >
      <CoffeeCollectionCard item={item(status)} busy={false} onToggleStatus={() => {}} />
    </LanguageContext.Provider>,
  )
}

describe('CoffeeCollectionCard', () => {
  it('renders coffee information and an intentional image-free placeholder', () => {
    const markup = renderCard()

    expect(markup).toContain('Citrus Lot')
    expect(markup).toContain('Northstar Roastery')
    expect(markup).toContain('Ethiopia')
    expect(markup).toContain('Yirgacheffe')
    expect(markup).toContain('custom fermentation')
    expect(markup).toContain('Light')
    expect(markup).toContain('Active')
    expect(markup).toContain('Mark finished')
  })

  it('shows the finished status and action to reactivate the purchase', () => {
    const markup = renderCard('finished')

    expect(markup).toContain('Finished')
    expect(markup).toContain('Move to active')
  })
})
