export type Tier = 'rookie' | 'veteran' | 'legend'

export interface Profile {
  $id: string
  userId: string
  username: string
  team: string
  xp: number
  pendingXp: number
  level: number
  coins: number
  pendingCoins: number
  ownedParts: string[]
  approved: boolean
  isAdmin: boolean
  tier: Tier
  $createdAt: string
}

export interface BikeConfig {
  $id: string
  userId: string
  bikeType: 'hardtail' | 'enduro' | 'downhill'
  suspension: 'air' | 'coil'
  material: 'alu' | 'carbon'
  bikeColor: string
  jerseyJ: string
  jerseyD: string
  hairColor?: string
  skinColor?: string
  eyeColor?: string
  shirtColor?: string
  pantsColor?: string
  hairStyle?: 'short' | 'long' | 'curly'
  avatarPresetId?: string
  avatarUrl?: string
  marke?: string
  modell?: string
  federweg_v?: string
  federweg_h?: string
  equippedFork?: string
  equippedShock?: string
}

export interface Session {
  $id: string
  userId: string
  date: string
  trailId: string
  $createdAt: string
}

export interface Run {
  $id: string
  sessionId: string
  userId: string
  username: string
  tier: Tier
  startedAt: string
  totalTime: number
  p1Time: number | null
  p2Time: number | null
  maxAirtime: number
  maxSpeed: number
  maxGForce: number
  distance: number
  dataSource: 'phone' | 'external'
  xpAwarded?: boolean
  $createdAt: string
}

export interface ClipPost {
  $id: string
  userId: string
  username: string
  tier: Tier
  runId: string | null
  contestMonth: string
  verified: boolean
  fireCount: number
  firedBy: string[]
  videoUrl?: string
  reactions?: string  // JSON: Record<emoji, userId[]>
  $createdAt: string
}

export interface ActiveRider {
  userId: string
  username: string
  tier: Tier
  lastRun: Run
}

export interface TrailRule {
  $id: string
  lineId: 'p1' | 'p2'
  name: string
  enabled: boolean
  startLat: number
  startLon: number
  finishLat: number
  finishLon: number
  startRadiusM: number
  finishRadiusM: number
  minStartSpeedMs: number
  directionToleranceDeg: number
  testSamples: string
  updatedBy: string
  $createdAt: string
}

export type FeatureType = 'jump' | 'sender' | 'drop' | 'corner' | 'berm' | 'rock_garden'

export interface TrailFeature {
  $id: string
  type: FeatureType
  name: string
  latitude: number
  longitude: number
  lineId: 'p1' | 'p2' | null
  createdBy: string
  $createdAt: string
}
