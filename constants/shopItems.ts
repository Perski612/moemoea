import type { ImageSourcePropType } from 'react-native'

export type PartCategory = 'fork' | 'shock'

export interface ShopItem {
  id: string
  name: string
  subtitle: string
  category: PartCategory
  price: number
  img: ImageSourcePropType
  spec: string
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── Fox Gabeln ────────────────────────────────────────────────────────────────
  {
    id: 'fox_gabel_orange',
    name: 'Fox 36 Factory',
    subtitle: 'Orange',
    category: 'fork',
    price: 150,
    img: require('@/BikeParts_Done/Fox/Shop/Fox36_Factory_Orange.png'),
    spec: '170mm Travel',
  },
  {
    id: 'fox_gabel_schwarz',
    name: 'Fox 36 Factory',
    subtitle: 'Schwarz',
    category: 'fork',
    price: 120,
    img: require('@/BikeParts_Done/Fox/Shop/Fox36_Factory_Schwarz.png'),
    spec: '160mm Travel',
  },

  // ── Fox Dämpfer ───────────────────────────────────────────────────────────────
  {
    id: 'fox_air',
    name: 'Fox Float X2',
    subtitle: 'Air Dämpfer',
    category: 'shock',
    price: 100,
    img: require('@/BikeParts_Done/Fox/Editor/Fox_FloatX2.png'),
    spec: 'Air Spring',
  },
  {
    id: 'fox_coil',
    name: 'Fox DHX2',
    subtitle: 'Coil Dämpfer',
    category: 'shock',
    price: 130,
    img: require('@/BikeParts_Done/Fox/Editor/Fox_Coil.png'),
    spec: 'Coil Spring',
  },

  // ── RockShox Gabeln ───────────────────────────────────────────────────────────
  {
    id: 'rockshox_pike_red',
    name: 'RockShox Pike',
    subtitle: 'Ultimate Red',
    category: 'fork',
    price: 140,
    img: require('@/BikeParts_Done/RockShoxx/Shop/RockShoxx_Shop_Pike_Red.png'),
    spec: '150mm Travel',
  },
  {
    id: 'rockshox_pike_silver',
    name: 'RockShox Pike',
    subtitle: 'Ultimate Silver',
    category: 'fork',
    price: 130,
    img: require('@/BikeParts_Done/RockShoxx/Shop/RockShoxx_Shop_Pike_Silver.png'),
    spec: '150mm Travel',
  },
  {
    id: 'rockshox_pike_black',
    name: 'RockShox Pike',
    subtitle: 'Ultimate Black',
    category: 'fork',
    price: 120,
    img: require('@/BikeParts_Done/RockShoxx/Shop/RockShoxx_Shop_Pike_Black.png'),
    spec: '150mm Travel',
  },
  {
    id: 'rockshox_zeb_red',
    name: 'RockShox Zeb',
    subtitle: 'Ultimate Red',
    category: 'fork',
    price: 160,
    img: require('@/BikeParts_Done/RockShoxx/Shop/RockShoxx_Shop_Zeb_Red.png'),
    spec: '170mm Travel',
  },
]

// Authoritative price map — validated server-side in purchaseItem action
export const ITEM_PRICES: Record<string, number> = Object.fromEntries(
  SHOP_ITEMS.map(i => [i.id, i.price])
)
