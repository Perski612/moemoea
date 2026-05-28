import { create } from 'zustand'
import { databases, DB_ID, TRAIL_RULES_ID, ID, Permission, Role, Query } from '@/lib/appwrite'
import { DEFAULT_TRAIL_DETECTION_OPTIONS, TRAIL_LINES, type TrailLineId } from '@/lib/trailDetection'
import type { TrailRule } from '@/types'

type TrailRuleInput = Omit<TrailRule, '$id' | '$createdAt'>

interface TrailRulesState {
  rules: TrailRule[]
  fetchRules: () => Promise<TrailRule[]>
  upsertRule: (data: TrailRuleInput) => Promise<TrailRule>
  defaultRules: () => TrailRuleInput[]
}

export function buildDefaultTrailRules(updatedBy = 'system'): TrailRuleInput[] {
  return TRAIL_LINES.map((line) => ({
    lineId: line.id,
    name: line.name,
    enabled: true,
    startLat: line.points[0].latitude,
    startLon: line.points[0].longitude,
    finishLat: line.points[line.points.length - 1].latitude,
    finishLon: line.points[line.points.length - 1].longitude,
    startRadiusM: line.startRadiusM,
    finishRadiusM: line.finishRadiusM,
    minStartSpeedMs: DEFAULT_TRAIL_DETECTION_OPTIONS.minStartSpeedMs,
    directionToleranceDeg: DEFAULT_TRAIL_DETECTION_OPTIONS.directionToleranceDeg,
    testSamples: '[]',
    updatedBy,
  }))
}

export const useTrailRulesStore = create<TrailRulesState>((set, get) => ({
  rules: [],

  defaultRules: () => buildDefaultTrailRules(),

  fetchRules: async () => {
    const res = await databases.listDocuments(DB_ID, TRAIL_RULES_ID, [
      Query.orderAsc('lineId'),
      Query.limit(20),
    ])
    const rules = res.documents as unknown as TrailRule[]
    set({ rules })
    return rules
  },

  upsertRule: async (data) => {
    const existing = get().rules.find((rule) => rule.lineId === data.lineId)

    const doc = existing
      ? await databases.updateDocument(DB_ID, TRAIL_RULES_ID, existing.$id, data)
      : await databases.createDocument(
          DB_ID,
          TRAIL_RULES_ID,
          ID.unique(),
          data,
          [Permission.read(Role.any()), Permission.update(Role.user(data.updatedBy)), Permission.delete(Role.user(data.updatedBy))],
        )

    const saved = doc as unknown as TrailRule
    set((state) => ({
      rules: [
        ...state.rules.filter((rule) => rule.lineId !== saved.lineId),
        saved,
      ].sort((a, b) => a.lineId.localeCompare(b.lineId)),
    }))
    return saved
  },
}))
