import { create } from 'zustand'
import { databases, DB_ID, SESSIONS_ID, RUNS_ID, ID, Permission, Role, Query } from '@/lib/appwrite'
import type { Session, Run, Tier, ActiveRider } from '@/types'

interface WeeklyStats { distance: number; airtime: number; topSpeed: number }
interface WeeklyRankEntry { rank: number; username: string; tier: Tier; totalTime: number; delta: string; isMe?: boolean }

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  tier: Tier
  value: number
  unit: string
}

interface SessionWithRuns { session: Session; runs: Run[] }

interface RunState {
  sessions: Session[]
  runs: Run[]
  createSession: (userId: string, date: string) => Promise<Session>
  createRun: (data: Omit<Run, '$id' | '$createdAt'>) => Promise<Run>
  getSessionsWithRuns: (userId: string) => Promise<SessionWithRuns[]>
  getPersonalBests: (userId: string) => Promise<{
    totalTime: number | null; p1Time: number | null; p2Time: number | null
    maxAirtime: number | null; maxSpeed: number | null; maxGForce: number | null
  }>
  getWeeklyStats: (userId: string) => Promise<WeeklyStats>
  getWeeklyRanking: (myUserId: string) => Promise<WeeklyRankEntry[]>
  getLeaderboard: (
    metric: 'airtime' | 'gforce' | 'speed' | 'time',
    section: 'gesamt' | 'p1' | 'p2',
    limit?: number
  ) => Promise<LeaderboardEntry[]>
  getActiveRiders: () => Promise<ActiveRider[]>
}

function weekBounds(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1
  const mon = new Date(now)
  mon.setDate(now.getDate() - day)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return { start: mon.toISOString(), end: sun.toISOString() }
}

function bestPerUser(runs: Run[], getValue: (r: Run) => number | null, ascending: boolean): LeaderboardEntry[] {
  const map = new Map<string, { run: Run; value: number }>()
  for (const run of runs) {
    const v = getValue(run)
    if (v == null) continue
    const existing = map.get(run.userId)
    if (!existing || (ascending ? v < existing.value : v > existing.value)) {
      map.set(run.userId, { run, value: v })
    }
  }
  return Array.from(map.values())
    .sort((a, b) => ascending ? a.value - b.value : b.value - a.value)
    .map(({ run, value }, i) => ({
      rank: i + 1,
      userId: run.userId,
      username: run.username,
      tier: run.tier,
      value,
      unit: '',
    }))
}

export const useRunStore = create<RunState>(() => ({
  sessions: [],
  runs: [],

  createSession: async (userId, date) => {
    const existing = await databases.listDocuments(DB_ID, SESSIONS_ID, [
      Query.equal('userId', userId),
      Query.equal('date', date),
      Query.limit(1),
    ])
    if (existing.documents[0]) return existing.documents[0] as unknown as Session

    const doc = await databases.createDocument(
      DB_ID, SESSIONS_ID, ID.unique(),
      { userId, date, trailId: 'moe-moea' },
      [Permission.read(Role.user(userId)), Permission.write(Role.user(userId))]
    )
    return doc as unknown as Session
  },

  createRun: async (data) => {
    const doc = await databases.createDocument(
      DB_ID, RUNS_ID, ID.unique(),
      data,
      [Permission.read(Role.any()), Permission.write(Role.user(data.userId))]
    )
    return doc as unknown as Run
  },

  getSessionsWithRuns: async (userId) => {
    const sessionsRes = await databases.listDocuments(DB_ID, SESSIONS_ID, [
      Query.equal('userId', userId),
      Query.orderDesc('date'),
      Query.limit(20),
    ])
    const sessions = sessionsRes.documents as unknown as Session[]

    const result: SessionWithRuns[] = await Promise.all(
      sessions.map(async (session) => {
        const runsRes = await databases.listDocuments(DB_ID, RUNS_ID, [
          Query.equal('sessionId', session.$id),
          Query.orderAsc('startedAt'),
        ])
        return { session, runs: runsRes.documents as unknown as Run[] }
      })
    )
    return result
  },

  getPersonalBests: async (userId) => {
    const res = await databases.listDocuments(DB_ID, RUNS_ID, [
      Query.equal('userId', userId),
      Query.limit(200),
    ])
    const runs = res.documents as unknown as Run[]
    if (runs.length === 0) return { totalTime: null, p1Time: null, p2Time: null, maxAirtime: null, maxSpeed: null, maxGForce: null }

    return {
      totalTime:  Math.min(...runs.map(r => r.totalTime)),
      p1Time:     runs.some(r => r.p1Time != null) ? Math.min(...runs.filter(r => r.p1Time != null).map(r => r.p1Time!)) : null,
      p2Time:     runs.some(r => r.p2Time != null) ? Math.min(...runs.filter(r => r.p2Time != null).map(r => r.p2Time!)) : null,
      maxAirtime: Math.max(...runs.map(r => r.maxAirtime)),
      maxSpeed:   Math.max(...runs.map(r => r.maxSpeed)),
      maxGForce:  Math.max(...runs.map(r => r.maxGForce)),
    }
  },

  getWeeklyStats: async (userId) => {
    const { start, end } = weekBounds()
    const res = await databases.listDocuments(DB_ID, RUNS_ID, [
      Query.equal('userId', userId),
      Query.greaterThanEqual('startedAt', start),
      Query.lessThanEqual('startedAt', end),
      Query.limit(200),
    ])
    const runs = res.documents as unknown as Run[]
    if (runs.length === 0) return { distance: 0, airtime: 0, topSpeed: 0 }
    return {
      distance: runs.reduce((s, r) => s + r.distance, 0),
      airtime:  runs.reduce((s, r) => s + r.maxAirtime, 0),
      topSpeed: Math.max(...runs.map(r => r.maxSpeed)),
    }
  },

  getWeeklyRanking: async (myUserId) => {
    const { start, end } = weekBounds()
    const res = await databases.listDocuments(DB_ID, RUNS_ID, [
      Query.greaterThanEqual('startedAt', start),
      Query.lessThanEqual('startedAt', end),
      Query.orderAsc('totalTime'),
      Query.limit(200),
    ])
    const runs = res.documents as unknown as Run[]
    const entries = bestPerUser(runs, r => r.totalTime, true).slice(0, 5)
    const leaderTime = entries[0]?.value ?? 0

    return entries.map((e, i) => ({
      rank: i + 1,
      username: e.username,
      tier: e.tier,
      totalTime: e.value,
      delta: i === 0 ? '—' : `+${(e.value - leaderTime).toFixed(1)}`,
      isMe: e.userId === myUserId,
    }))
  },

  getLeaderboard: async (metric, section, limit = 10) => {
    const metricField = { airtime: 'maxAirtime', gforce: 'maxGForce', speed: 'maxSpeed', time: 'totalTime' }[metric]
    const ascending = metric === 'time'
    const orderQuery = ascending ? Query.orderAsc(metricField) : Query.orderDesc(metricField)

    const extraFilters: string[] = []
    if (section === 'p1') extraFilters.push(Query.isNotNull('p1Time'))
    if (section === 'p2') extraFilters.push(Query.isNotNull('p2Time'))

    const res = await databases.listDocuments(DB_ID, RUNS_ID, [
      orderQuery,
      ...extraFilters,
      Query.limit(200),
    ])
    const runs = res.documents as unknown as Run[]

    const getValue = (r: Run): number | null => {
      if (section === 'p1' && metric === 'time') return r.p1Time
      if (section === 'p2' && metric === 'time') return r.p2Time
      return { maxAirtime: r.maxAirtime, maxGForce: r.maxGForce, maxSpeed: r.maxSpeed, totalTime: r.totalTime }[metricField] ?? null
    }

    return bestPerUser(runs, getValue, ascending).slice(0, limit)
  },

  getActiveRiders: async () => {
    const threshold = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const res = await databases.listDocuments(DB_ID, RUNS_ID, [
      Query.greaterThanEqual('startedAt', threshold),
      Query.orderDesc('startedAt'),
      Query.limit(100),
    ])
    const runs = res.documents as unknown as Run[]
    const seen = new Set<string>()
    const riders: ActiveRider[] = []
    for (const run of runs) {
      if (!seen.has(run.userId)) {
        seen.add(run.userId)
        riders.push({ userId: run.userId, username: run.username, tier: run.tier, lastRun: run })
      }
    }
    return riders
  },
}))
