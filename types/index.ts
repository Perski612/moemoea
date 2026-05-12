export interface Profile {
  $id: string
  userId: string
  username: string
  team: string
  xp: number
  level: number
  approved: boolean
  isAdmin: boolean
  $createdAt: string
}

export interface BikeConfig {
  $id: string
  userId: string
  bikeType: 'hardtail' | 'fully'
  suspension: 'air' | 'coil'
  material: 'alu' | 'carbon'
  bikeColor: string
  jerseyJ: string
  jerseyD: string
}

export type Tier = 'rookie' | 'veteran' | 'legend'
