import { UUIDSchema } from '@/domain/shared'
import type { UUID } from '@/domain/shared'

function stableSeedId(namespace: string, index: number): UUID {
  return UUIDSchema.parse(
    `${namespace}-0000-4000-8000-${index.toString().padStart(12, '0')}`,
  )
}

export const seedOrigins = [
  'Bolivia',
  'Brazil',
  'Burundi',
  'Colombia',
  'Costa Rica',
  'Ecuador',
  'El Salvador',
  'Ethiopia',
  'Guatemala',
  'Honduras',
  'India',
  'Indonesia',
  'Kenya',
  'Mexico',
  'Nicaragua',
  'Panama',
  'Papua New Guinea',
  'Peru',
  'Rwanda',
  'Tanzania',
  'Uganda',
  'Yemen',
].map((name, index) => ({
  id: stableSeedId('70000000', index + 1),
  name,
}))

export const seedVarieties = [
  'Gesha',
  'Geisha',
  'Caturra',
  'Catuai',
  'Bourbon',
  'Typica',
  'SL28',
  'SL34',
  'Heirloom',
  'Pacamara',
  'Castillo',
  'Pink Bourbon',
  'Java',
].map((name, index) => ({
  id: stableSeedId('30000000', index + 1),
  name,
}))

export const seedProcessingMethods = [
  'Washed',
  'Natural',
  'Honey',
  'Anaerobic',
  'Carbonic Maceration',
  'Wet Hulled',
  'Experimental',
  'Extended Fermentation',
].map((name, index) => ({
  id: stableSeedId('40000000', index + 1),
  name,
}))

const flavorFamilyNames = [
  'Fruity',
  'Floral',
  'Sweet',
  'Chocolate',
  'Nutty',
  'Spices',
  'Other',
]

export const seedFlavorFamilies = flavorFamilyNames.map((name, index) => ({
  id: stableSeedId('50000000', index + 1),
  name,
}))

const flavorDescriptorsByFamily: Record<string, string[]> = {
  Fruity: [
    'Berry',
    'Blueberry',
    'Strawberry',
    'Raspberry',
    'Grape',
    'Citrus',
    'Lemon',
    'Orange',
    'Tropical Fruit',
    'Pineapple',
    'Mango',
    'Stone Fruit',
    'Peach',
  ],
  Floral: ['Jasmine', 'Rose', 'Orange Blossom', 'Lavender'],
  Sweet: ['Honey', 'Caramel', 'Brown Sugar', 'Vanilla', 'Molasses'],
  Chocolate: ['Dark Chocolate', 'Milk Chocolate', 'Cocoa'],
  Nutty: ['Almond', 'Hazelnut', 'Peanut'],
  Spices: ['Cinnamon', 'Clove', 'Cardamom'],
  Other: ['Tea-like', 'Herbal', 'Tobacco', 'Winey'],
}

export const seedFlavorDescriptors = seedFlavorFamilies.flatMap(
  (family, familyIndex) =>
    (flavorDescriptorsByFamily[family.name] ?? []).map((name, index) => ({
      id: stableSeedId(
        '60000000',
        familyIndex * 100 + index + 1,
      ),
      familyId: family.id,
      name,
    })),
)
