import { create } from 'zustand'
import { databases, DB_ID, TRAIL_FEATURES_ID, ID, Permission, Role, Query } from '@/lib/appwrite'
import type { TrailFeature, FeatureType } from '@/types'

type FeatureInput = {
  type: FeatureType
  name: string
  latitude: number
  longitude: number
  lineId: 'p1' | 'p2' | null
  createdBy: string
}

interface TrailFeaturesState {
  features: TrailFeature[]
  fetchFeatures: () => Promise<void>
  addFeature: (data: FeatureInput) => Promise<TrailFeature>
  deleteFeature: (id: string) => Promise<void>
}

export const useTrailFeaturesStore = create<TrailFeaturesState>((set, get) => ({
  features: [],

  fetchFeatures: async () => {
    try {
      const res = await databases.listDocuments(DB_ID, TRAIL_FEATURES_ID, [Query.limit(100)])
      set({ features: res.documents as unknown as TrailFeature[] })
    } catch {
      // collection not yet created — silently ignore
    }
  },

  addFeature: async (data) => {
    const doc = await databases.createDocument(
      DB_ID,
      TRAIL_FEATURES_ID,
      ID.unique(),
      data,
      [Permission.read(Role.any()), Permission.delete(Role.user(data.createdBy))],
    ).catch((e) => { throw new Error(e?.message ?? 'Appwrite collection not found — create trail_features first') })
    const saved = doc as unknown as TrailFeature
    set(state => ({ features: [...state.features, saved] }))
    return saved
  },

  deleteFeature: async (id) => {
    await databases.deleteDocument(DB_ID, TRAIL_FEATURES_ID, id).catch(() => undefined)
    set(state => ({ features: state.features.filter(f => f.$id !== id) }))
  },
}))
