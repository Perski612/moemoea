import { create } from 'zustand'
import { databases, DB_ID, PROFILES_ID, BIKE_CONFIGS_ID, Permission, Role, ID } from '@/lib/appwrite'
import type { Profile, BikeConfig } from '@/types'
import { getLevelFromXp } from '@/lib/xp'

interface ProfileState {
  profile: Profile | null
  bikeConfig: BikeConfig | null
  setProfile: (p: Profile) => void
  setBikeConfig: (b: BikeConfig) => void
  syncFromAppwrite: (userId: string) => Promise<void>
  saveBikeConfig: (config: Omit<BikeConfig, '$id' | 'userId'>) => Promise<void>
  addPendingXp: (amount: number) => Promise<void>
  claimPendingXp: () => Promise<{ claimed: number; levelUps: number } | null>
  clear: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  bikeConfig: null,

  setProfile: (profile) => set({ profile }),
  setBikeConfig: (bikeConfig) => set({ bikeConfig }),
  clear: () => set({ profile: null, bikeConfig: null }),

  syncFromAppwrite: async (userId: string) => {
    const [profile, bikeConfig] = await Promise.all([
      databases.getDocument(DB_ID, PROFILES_ID, userId),
      databases.getDocument(DB_ID, BIKE_CONFIGS_ID, userId).catch(() => null),
    ])
    set({ profile: profile as unknown as Profile, bikeConfig: bikeConfig as unknown as BikeConfig | null })
  },

  addPendingXp: async (amount) => {
    const profile = get().profile
    if (!profile) return
    const newPending = (profile.pendingXp ?? 0) + amount
    await databases.updateDocument(DB_ID, PROFILES_ID, profile.$id, { pendingXp: newPending })
    set({ profile: { ...profile, pendingXp: newPending } })
  },

  claimPendingXp: async () => {
    const profile = get().profile
    if (!profile || !profile.pendingXp) return null

    const claimed = profile.pendingXp
    const oldLevel = profile.level
    const newXp = profile.xp + claimed
    const newLevel = getLevelFromXp(newXp)

    await databases.updateDocument(DB_ID, PROFILES_ID, profile.$id, {
      xp: newXp,
      level: newLevel,
      pendingXp: 0,
    })
    set({ profile: { ...profile, xp: newXp, level: newLevel, pendingXp: 0 } })

    return { claimed, levelUps: newLevel - oldLevel }
  },

  saveBikeConfig: async (config) => {
    const userId = get().profile?.$id
    if (!userId) throw new Error('No profile loaded')

    const permissions = [
      Permission.read(Role.user(userId)),
      Permission.write(Role.user(userId)),
    ]

    let doc: unknown
    try {
      doc = await databases.createDocument(DB_ID, BIKE_CONFIGS_ID, userId, { userId, ...config }, permissions)
    } catch (e: any) {
      if (e?.code === 409) {
        doc = await databases.updateDocument(DB_ID, BIKE_CONFIGS_ID, userId, config)
      } else {
        throw e
      }
    }
    set({ bikeConfig: doc as unknown as BikeConfig })
  },
}))
