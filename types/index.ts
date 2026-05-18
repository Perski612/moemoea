export type Tier = 'rookie' | 'veteran' | 'legend'

export interface Profile {
  $id: string
  userId: string
  username: string
  team: string
  xp: number
  level: number
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
  $createdAt: string
}
