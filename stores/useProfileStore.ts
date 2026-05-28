import { create } from 'zustand'
import { databases, callAction, DB_ID, PROFILES_ID, BIKE_CONFIGS_ID, Permission, Role } from '@/lib/appwrite'
import type { Profile, BikeConfig } from '@/types'
import type { RunXpBreakdown } from '@/lib/xp'

interface ProfileState {
  profile: Profile | null
  bikeConfig: BikeConfig | null
  setProfile: (p: Profile) => void
  setBikeConfig: (b: BikeConfig) => void
  syncFromAppwrite: (userId: string) => Promise<void>
  saveBikeConfig: (config: Omit<BikeConfig, '$id' | 'userId'>) => Promise<void>
  awardRunXp: (runId: string) => Promise<RunXpBreakdown | null>
  claimPendingXp: () => Promise<{ claimed: number; levelUps: number } | null>
  purchaseItem: (itemId: string) => Promise<void>
  equipPart: (category: 'fork' | 'shock', itemId: string | null) => Promise<void>
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

  awardRunXp: async (runId) => {
    const profile = get().profile
    if (!profile) return null
    // Server recomputes XP from the run; client cannot set its own XP.
    const result = await callAction<RunXpBreakdown & { pendingXp?: number; pendingCoins?: number }>('addPendingXp', { runId })
    const patch: Partial<Profile> = {}
    if (typeof result.pendingXp === 'number') patch.pendingXp = result.pendingXp
    if (typeof result.pendingCoins === 'number') patch.pendingCoins = result.pendingCoins
    if (Object.keys(patch).length) set({ profile: { ...profile, ...patch } })
    return result
  },

  claimPendingXp: async () => {
    const profile = get().profile
    if (!profile || (!profile.pendingXp && !profile.pendingCoins)) return null

    const result = await callAction<{ claimed: number; levelUps: number; xp: number; level: number; coins: number }>('claimXp')
    set({ profile: { ...profile, xp: result.xp, level: result.level, pendingXp: 0, coins: result.coins, pendingCoins: 0 } })

    return { claimed: result.claimed, levelUps: result.levelUps }
  },

  purchaseItem: async (itemId: string) => {
    const profile = get().profile
    if (!profile) throw new Error('No profile')
    const result = await callAction<{ coins: number; ownedParts: string[] }>('purchaseItem', { itemId })
    set({ profile: { ...profile, coins: result.coins, ownedParts: result.ownedParts } })
  },

  equipPart: async (category: 'fork' | 'shock', itemId: string | null) => {
    const { bikeConfig, saveBikeConfig } = get()
    if (!bikeConfig) throw new Error('No bike config')
    const { $id: _id, userId: _uid, ...configWithoutIds } = bikeConfig
    const patch = category === 'fork'
      ? { equippedFork: itemId ?? undefined }
      : { equippedShock: itemId ?? undefined }
    await saveBikeConfig({ ...configWithoutIds, ...patch })
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
