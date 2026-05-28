import type { ImageSourcePropType } from 'react-native'

export interface EmblemDef {
  tier: string
  name: string
  source: ImageSourcePropType
  sizeFactor?: number
  tierColor: string
  glowIntensity: 1 | 2 | 3
}

const BRONZE = '#8B5E3C'
const SILBER  = '#A8A9AD'
const GOLD    = '#C9A84C'
const DIAMOND = '#63d0e9'

const EMBLEMS: EmblemDef[] = [
  { tier: 'bronze3', name: 'BRONZE III', tierColor: BRONZE,  glowIntensity: 1, source: require('@/assets/avatar-parts/Embleme/Bronze3.png') },
  { tier: 'bronze2', name: 'BRONZE II',  tierColor: BRONZE,  glowIntensity: 2, source: require('@/assets/avatar-parts/Embleme/Bronze2.png') },
  { tier: 'bronze1', name: 'BRONZE I',   tierColor: BRONZE,  glowIntensity: 3, source: require('@/assets/avatar-parts/Embleme/Bronze1.png') },
  { tier: 'silber3', name: 'SILBER III', tierColor: SILBER,  glowIntensity: 1, source: require('@/assets/avatar-parts/Embleme/Silber3.png') },
  { tier: 'silber2', name: 'SILBER II',  tierColor: SILBER,  glowIntensity: 2, source: require('@/assets/avatar-parts/Embleme/Silber2.png') },
  { tier: 'silber1', name: 'SILBER I',   tierColor: SILBER,  glowIntensity: 3, source: require('@/assets/avatar-parts/Embleme/Silber1.png') },
  { tier: 'gold3',   name: 'GOLD III',   tierColor: GOLD,    glowIntensity: 1, source: require('@/assets/avatar-parts/Embleme/Gold3.png') },
  { tier: 'gold2',   name: 'GOLD II',    tierColor: GOLD,    glowIntensity: 2, source: require('@/assets/avatar-parts/Embleme/Gold2.png'), sizeFactor: 1.35 },
  { tier: 'gold1',   name: 'GOLD I',     tierColor: GOLD,    glowIntensity: 3, source: require('@/assets/avatar-parts/Embleme/Gold1.png') },
  { tier: 'dia3',    name: 'DIAMOND III',tierColor: DIAMOND, glowIntensity: 1, source: require('@/assets/avatar-parts/Embleme/Diamand3.png'), sizeFactor: 0.9 },
  { tier: 'dia2',    name: 'DIAMOND II', tierColor: DIAMOND, glowIntensity: 2, source: require('@/assets/avatar-parts/Embleme/Diamand2.png') },
  { tier: 'dia1',    name: 'DIAMOND I',  tierColor: DIAMOND, glowIntensity: 3, source: require('@/assets/avatar-parts/Embleme/Diamand1.png') },
]

// LVL 1–4 → Bronze I, LVL 5–9 → Bronze II, ... LVL 55+ → Diamond III
export function getEmblemForLevel(level: number): EmblemDef {
  const idx = Math.min(Math.floor((level - 1) / 5), EMBLEMS.length - 1)
  return EMBLEMS[Math.max(0, idx)]
}
