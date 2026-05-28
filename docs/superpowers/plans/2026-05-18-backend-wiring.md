# Backend Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create all Appwrite collections and wire every screen away from mock data to real Appwrite queries.

**Architecture:** Sensor data is processed on-device and only metrics (numbers) are uploaded. The `runs` collection is the single source of truth for leaderboard, dashboard, and strecke. Each store owns one domain (runs, feed) and screens subscribe to stores via Zustand.

**Tech Stack:** Appwrite SDK (already installed), Zustand (already installed), TypeScript, Expo React Native

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `.env.local` | Create | Real Appwrite env vars (gitignored) |
| `jest.setup.env.js` | Modify | Add new collection IDs for tests |
| `types/index.ts` | Modify | Add `tier` to Profile, add Session/Run/ClipPost types |
| `lib/appwrite.ts` | Modify | Export SESSIONS_ID, RUNS_ID, CLIP_POSTS_ID |
| `stores/useRunStore.ts` | Create | Sessions + runs CRUD, leaderboard, personal bests, weekly stats |
| `stores/useFeedStore.ts` | Create | Clip posts CRUD + fire toggle |
| `__tests__/stores/useRunStore.test.ts` | Create | Store unit tests |
| `__tests__/stores/useFeedStore.test.ts` | Create | Store unit tests |
| `app/(app)/(tabs)/dashboard.tsx` | Modify | Wire to useRunStore |
| `app/(app)/(tabs)/leaderboard.tsx` | Modify | Wire to useRunStore |
| `app/(app)/(tabs)/feed.tsx` | Modify | Wire to useFeedStore |
| `app/(app)/(tabs)/strecke.tsx` | Modify | Wire to useRunStore |

---

## Task 1: Appwrite Console — Create Collections

**Manual steps in https://cloud.appwrite.io/console/project-fra-6a032a7a002bf847e2cb/databases/database-trails-db**

This task has no code — all steps are in the Appwrite web console.

- [ ] **Step 1: Add `tier` attribute to existing `profiles` collection**

  In the `profiles` collection → Attributes → Create attribute:
  - Type: **Enum**
  - Key: `tier`
  - Elements: `rookie`, `veteran`, `legend`
  - Default: `rookie`
  - Required: No (existing docs don't have it yet)

- [ ] **Step 2: Create `sessions` collection**

  Collections → Create collection:
  - Collection ID: `sessions`
  - Name: `sessions`
  - Permissions: Users (each user reads/writes their own docs)

  Attributes:
  | Key | Type | Required | Default |
  |-----|------|----------|---------|
  | userId | String, size 36 | Yes | — |
  | date | String, size 10 | Yes | — |
  | trailId | String, size 36 | Yes | `moe-moea` |

  Indexes:
  - Key: `by_user_date`, Type: Key, Attributes: `userId ASC`, `date DESC`

- [ ] **Step 3: Create `runs` collection**

  Collections → Create collection:
  - Collection ID: `runs`
  - Name: `runs`

  Attributes:
  | Key | Type | Required | Notes |
  |-----|------|----------|-------|
  | sessionId | String, size 36 | Yes | |
  | userId | String, size 36 | Yes | |
  | username | String, size 64 | Yes | Denormalized from profile |
  | tier | Enum: rookie, veteran, legend | Yes | Denormalized from profile |
  | startedAt | DateTime | Yes | |
  | totalTime | Float | Yes | seconds |
  | p1Time | Float | No | seconds, null if P1 not completed |
  | p2Time | Float | No | seconds, null if P2 not completed |
  | maxAirtime | Float | Yes | seconds |
  | maxSpeed | Float | Yes | km/h |
  | maxGForce | Float | Yes | g |
  | distance | Float | Yes | meters |
  | dataSource | Enum: phone, external | Yes | |

  Indexes:
  - `by_user`: Key, `userId ASC`
  - `by_session`: Key, `sessionId ASC`
  - `by_started`: Key, `startedAt DESC`
  - `by_airtime`: Key, `maxAirtime DESC`
  - `by_speed`: Key, `maxSpeed DESC`
  - `by_gforce`: Key, `maxGForce DESC`
  - `by_time`: Key, `totalTime ASC`
  - `by_p1`: Key, `p1Time ASC`
  - `by_p2`: Key, `p2Time ASC`

- [ ] **Step 4: Create `clip_posts` collection**

  Collections → Create collection:
  - Collection ID: `clip_posts`
  - Name: `clip_posts`

  Attributes:
  | Key | Type | Required | Notes |
  |-----|------|----------|-------|
  | userId | String, size 36 | Yes | |
  | username | String, size 64 | Yes | Denormalized |
  | tier | Enum: rookie, veteran, legend | Yes | Denormalized |
  | runId | String, size 36 | No | |
  | contestMonth | String, size 7 | Yes | YYYY-MM |
  | verified | Boolean | Yes | Default: false |
  | fireCount | Integer | Yes | Default: 0 |
  | firedBy | String[] (size 36 each, max 200) | No | Array of userIds |

  Indexes:
  - `by_contest`: Key, `contestMonth DESC`, `fireCount DESC`
  - `by_user`: Key, `userId ASC`

- [ ] **Step 5: Commit**

  ```bash
  git commit --allow-empty -m "chore: create Appwrite collections (sessions, runs, clip_posts)"
  ```

---

## Task 2: Environment Variables + Collection ID Exports

**Files:**
- Create: `.env.local`
- Modify: `jest.setup.env.js`
- Modify: `lib/appwrite.ts`

- [ ] **Step 1: Create `.env.local`**

  Check `.gitignore` has `*.local` or `.env.local` before creating.

  ```bash
  grep -n "env.local\|\.env" "/Users/drixxen/Library/Mobile Documents/com~apple~CloudDocs/MoeMoeaTrails/.gitignore"
  ```

  Create `.env.local`:
  ```
  EXPO_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
  EXPO_PUBLIC_APPWRITE_PROJECT_ID=fra-6a032a7a002bf847e2cb
  EXPO_PUBLIC_DB_ID=database-trails-db
  EXPO_PUBLIC_PROFILES_ID=profiles
  EXPO_PUBLIC_BIKE_CONFIGS_ID=bike_configs
  EXPO_PUBLIC_SESSIONS_ID=sessions
  EXPO_PUBLIC_RUNS_ID=runs
  EXPO_PUBLIC_CLIP_POSTS_ID=clip_posts
  ```

- [ ] **Step 2: Update `jest.setup.env.js`**

  Full file after change:
  ```js
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1'
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID = '6a032a7a002bf847e2cb'
  process.env.EXPO_PUBLIC_DB_ID = 'trails-db'
  process.env.EXPO_PUBLIC_PROFILES_ID = 'profiles'
  process.env.EXPO_PUBLIC_BIKE_CONFIGS_ID = 'bike_configs'
  process.env.EXPO_PUBLIC_SESSIONS_ID = 'sessions'
  process.env.EXPO_PUBLIC_RUNS_ID = 'runs'
  process.env.EXPO_PUBLIC_CLIP_POSTS_ID = 'clip_posts'
  ```

- [ ] **Step 3: Update `lib/appwrite.ts`**

  ```ts
  import 'react-native-url-polyfill/auto'
  import { Client, Account, Databases, Teams, ID, Permission, Role, Query } from 'appwrite'

  const endpoint  = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT  ?? 'http://localhost/v1'
  const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? 'demo'

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)

  export const account   = new Account(client)
  export const databases = new Databases(client)
  export const teams     = new Teams(client)

  export const DB_ID           = process.env.EXPO_PUBLIC_DB_ID           ?? ''
  export const PROFILES_ID     = process.env.EXPO_PUBLIC_PROFILES_ID     ?? ''
  export const BIKE_CONFIGS_ID = process.env.EXPO_PUBLIC_BIKE_CONFIGS_ID ?? ''
  export const SESSIONS_ID     = process.env.EXPO_PUBLIC_SESSIONS_ID     ?? ''
  export const RUNS_ID         = process.env.EXPO_PUBLIC_RUNS_ID         ?? ''
  export const CLIP_POSTS_ID   = process.env.EXPO_PUBLIC_CLIP_POSTS_ID   ?? ''

  export const IS_DEMO = !process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT

  export { ID, Permission, Role, Query }
  ```

- [ ] **Step 4: Update `__tests__/lib/appwrite.test.ts`** to assert new exports:

  ```ts
  describe('appwrite singleton', () => {
    it('exports account, databases, and collection IDs', () => {
      const mod = require('@/lib/appwrite')
      expect(mod.account).toBeDefined()
      expect(mod.databases).toBeDefined()
      expect(mod.DB_ID).toBe('trails-db')
      expect(mod.PROFILES_ID).toBe('profiles')
      expect(mod.BIKE_CONFIGS_ID).toBe('bike_configs')
      expect(mod.SESSIONS_ID).toBe('sessions')
      expect(mod.RUNS_ID).toBe('runs')
      expect(mod.CLIP_POSTS_ID).toBe('clip_posts')
    })
  })
  ```

- [ ] **Step 5: Run tests**

  ```bash
  cd "/Users/drixxen/Library/Mobile Documents/com~apple~CloudDocs/MoeMoeaTrails" && npx jest __tests__/lib/appwrite.test.ts --no-coverage
  ```

  Expected: PASS

- [ ] **Step 6: Commit**

  ```bash
  git add lib/appwrite.ts jest.setup.env.js __tests__/lib/appwrite.test.ts
  git commit -m "feat: add sessions/runs/clip_posts collection ID exports"
  ```

---

## Task 3: Update TypeScript Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Replace `types/index.ts`**

  ```ts
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
    bikeType: 'hardtail' | 'fully'
    suspension: 'air' | 'coil'
    material: 'alu' | 'carbon'
    bikeColor: string
    jerseyJ: string
    jerseyD: string
  }

  export interface Session {
    $id: string
    userId: string
    date: string       // YYYY-MM-DD
    trailId: string
    $createdAt: string
  }

  export interface Run {
    $id: string
    sessionId: string
    userId: string
    username: string
    tier: Tier
    startedAt: string  // ISO datetime
    totalTime: number  // seconds
    p1Time: number | null
    p2Time: number | null
    maxAirtime: number // seconds
    maxSpeed: number   // km/h
    maxGForce: number  // g
    distance: number   // meters
    dataSource: 'phone' | 'external'
    $createdAt: string
  }

  export interface ClipPost {
    $id: string
    userId: string
    username: string
    tier: Tier
    runId: string | null
    contestMonth: string  // YYYY-MM
    verified: boolean
    fireCount: number
    firedBy: string[]
    $createdAt: string
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add types/index.ts
  git commit -m "feat: add Session, Run, ClipPost types; add tier to Profile"
  ```

---

## Task 4: useRunStore

**Files:**
- Create: `stores/useRunStore.ts`
- Create: `__tests__/stores/useRunStore.test.ts`

The store exposes:
- `createSession(userId, date)` → Session
- `createRun(data)` → Run
- `getSessionsWithRuns(userId)` → `{ session: Session, runs: Run[] }[]` sorted date desc
- `getPersonalBests(userId)` → best totalTime, p1Time, p2Time, maxAirtime, maxSpeed, maxGForce + overall rank
- `getWeeklyStats(userId)` → `{ distance: number, airtime: number, topSpeed: number }`
- `getWeeklyRanking()` → top 5 users by best totalTime this week, with username, tier, delta from leader
- `getLeaderboard(metric, section)` → top 10 entries per metric/section

- [ ] **Step 1: Write failing tests**

  Create `__tests__/stores/useRunStore.test.ts`:

  ```ts
  import { renderHook, act } from '@testing-library/react-native'

  jest.mock('@/lib/appwrite', () => ({
    databases: {
      createDocument: jest.fn(),
      listDocuments: jest.fn(),
    },
    DB_ID: 'trails-db',
    SESSIONS_ID: 'sessions',
    RUNS_ID: 'runs',
    ID: { unique: () => 'mock-id' },
    Query: {
      equal: (k: string, v: unknown) => `equal(${k},${v})`,
      orderDesc: (k: string) => `orderDesc(${k})`,
      orderAsc: (k: string) => `orderAsc(${k})`,
      limit: (n: number) => `limit(${n})`,
      greaterThanEqual: (k: string, v: unknown) => `gte(${k},${v})`,
      lessThanEqual: (k: string, v: unknown) => `lte(${k},${v})`,
      isNotNull: (k: string) => `notNull(${k})`,
    },
  }))

  import { useRunStore } from '@/stores/useRunStore'
  import { databases } from '@/lib/appwrite'

  const db = databases as jest.Mocked<typeof databases>

  beforeEach(() => {
    jest.clearAllMocks()
    useRunStore.setState({ sessions: [], runs: [] })
  })

  describe('useRunStore.createSession', () => {
    it('creates a session document and returns it', async () => {
      const mockSession = { $id: 's1', userId: 'u1', date: '2026-05-18', trailId: 'moe-moea', $createdAt: '' }
      db.createDocument.mockResolvedValueOnce(mockSession as any)

      const { result } = renderHook(() => useRunStore())
      let session: any
      await act(async () => { session = await result.current.createSession('u1', '2026-05-18') })

      expect(db.createDocument).toHaveBeenCalledWith('trails-db', 'sessions', 'mock-id', {
        userId: 'u1', date: '2026-05-18', trailId: 'moe-moea',
      }, expect.any(Array))
      expect(session.$id).toBe('s1')
    })
  })

  describe('useRunStore.createRun', () => {
    it('creates a run document and returns it', async () => {
      const mockRun = { $id: 'r1', userId: 'u1', totalTime: 82.5, $createdAt: '' }
      db.createDocument.mockResolvedValueOnce(mockRun as any)

      const { result } = renderHook(() => useRunStore())
      let run: any
      await act(async () => {
        run = await result.current.createRun({
          sessionId: 's1', userId: 'u1', username: 'Max', tier: 'rookie',
          startedAt: '2026-05-18T10:00:00.000Z',
          totalTime: 82.5, p1Time: 44.9, p2Time: 32.6,
          maxAirtime: 2.34, maxSpeed: 67, maxGForce: 4.2,
          distance: 1200, dataSource: 'phone',
        })
      })

      expect(db.createDocument).toHaveBeenCalledTimes(1)
      expect(run.$id).toBe('r1')
    })
  })

  describe('useRunStore.getWeeklyStats', () => {
    it('sums distance and airtime, takes max speed for the week', async () => {
      db.listDocuments.mockResolvedValueOnce({
        total: 3,
        documents: [
          { distance: 1200, maxAirtime: 2.1, maxSpeed: 60 },
          { distance: 1200, maxAirtime: 3.4, maxSpeed: 67 },
          { distance: 1200, maxAirtime: 1.8, maxSpeed: 55 },
        ],
      } as any)

      const { result } = renderHook(() => useRunStore())
      let stats: any
      await act(async () => { stats = await result.current.getWeeklyStats('u1') })

      expect(stats.distance).toBeCloseTo(3600)
      expect(stats.airtime).toBeCloseTo(7.3)
      expect(stats.topSpeed).toBe(67)
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  cd "/Users/drixxen/Library/Mobile Documents/com~apple~CloudDocs/MoeMoeaTrails" && npx jest __tests__/stores/useRunStore.test.ts --no-coverage 2>&1 | tail -20
  ```

  Expected: FAIL — "Cannot find module '@/stores/useRunStore'"

- [ ] **Step 3: Create `stores/useRunStore.ts`**

  ```ts
  import { create } from 'zustand'
  import { databases, DB_ID, SESSIONS_ID, RUNS_ID, ID, Permission, Role, Query } from '@/lib/appwrite'
  import type { Session, Run, Tier } from '@/types'

  interface WeeklyStats { distance: number; airtime: number; topSpeed: number }
  interface WeeklyRankEntry { rank: number; username: string; tier: Tier; totalTime: number; delta: string; isMe?: boolean }

  interface LeaderboardEntry {
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
  }

  function weekBounds(): { start: string; end: string } {
    const now = new Date()
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0
    const mon = new Date(now)
    mon.setDate(now.getDate() - day)
    mon.setHours(0, 0, 0, 0)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    sun.setHours(23, 59, 59, 999)
    return { start: mon.toISOString(), end: sun.toISOString() }
  }

  function bestPerUser(runs: Run[], getValue: (r: Run) => number | null, ascending: boolean): LeaderboardEntry[] {
    const METRIC_UNITS: Record<string, string> = {
      airtime: 's', gforce: 'g', speed: 'km/h', time: 's',
    }
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
  }))
  ```

- [ ] **Step 4: Run tests**

  ```bash
  cd "/Users/drixxen/Library/Mobile Documents/com~apple~CloudDocs/MoeMoeaTrails" && npx jest __tests__/stores/useRunStore.test.ts --no-coverage
  ```

  Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

  ```bash
  git add stores/useRunStore.ts __tests__/stores/useRunStore.test.ts
  git commit -m "feat: add useRunStore with sessions/runs CRUD and leaderboard queries"
  ```

---

## Task 5: useFeedStore

**Files:**
- Create: `stores/useFeedStore.ts`
- Create: `__tests__/stores/useFeedStore.test.ts`

- [ ] **Step 1: Write failing tests**

  Create `__tests__/stores/useFeedStore.test.ts`:

  ```ts
  import { renderHook, act } from '@testing-library/react-native'

  jest.mock('@/lib/appwrite', () => ({
    databases: {
      createDocument: jest.fn(),
      listDocuments: jest.fn(),
      updateDocument: jest.fn(),
    },
    DB_ID: 'trails-db',
    CLIP_POSTS_ID: 'clip_posts',
    ID: { unique: () => 'mock-id' },
    Query: {
      equal: (k: string, v: unknown) => `equal(${k},${v})`,
      orderDesc: (k: string) => `orderDesc(${k})`,
      limit: (n: number) => `limit(${n})`,
    },
    Permission: { read: jest.fn(() => 'read'), write: jest.fn(() => 'write') },
    Role: { any: jest.fn(() => 'any'), user: jest.fn((id: string) => `user:${id}`) },
  }))

  import { useFeedStore } from '@/stores/useFeedStore'
  import { databases } from '@/lib/appwrite'

  const db = databases as jest.Mocked<typeof databases>

  beforeEach(() => {
    jest.clearAllMocks()
    useFeedStore.setState({ posts: [] })
  })

  describe('useFeedStore.getClipPosts', () => {
    it('loads posts for a contest month', async () => {
      db.listDocuments.mockResolvedValueOnce({
        total: 1,
        documents: [{ $id: 'p1', userId: 'u1', username: 'Max', tier: 'rookie', contestMonth: '2026-05', verified: true, fireCount: 10, firedBy: [], $createdAt: '' }],
      } as any)

      const { result } = renderHook(() => useFeedStore())
      await act(async () => { await result.current.getClipPosts('2026-05') })

      expect(result.current.posts).toHaveLength(1)
      expect(result.current.posts[0].username).toBe('Max')
    })
  })

  describe('useFeedStore.toggleFire', () => {
    it('adds userId to firedBy and increments fireCount', async () => {
      useFeedStore.setState({
        posts: [{ $id: 'p1', userId: 'u2', username: 'Sara', tier: 'rookie', runId: null, contestMonth: '2026-05', verified: true, fireCount: 5, firedBy: [], $createdAt: '' }],
      })
      db.updateDocument.mockResolvedValueOnce({ $id: 'p1', fireCount: 6, firedBy: ['u1'] } as any)

      const { result } = renderHook(() => useFeedStore())
      await act(async () => { await result.current.toggleFire('p1', 'u1') })

      expect(db.updateDocument).toHaveBeenCalledWith('trails-db', 'clip_posts', 'p1', {
        fireCount: 6,
        firedBy: ['u1'],
      })
    })

    it('removes userId from firedBy and decrements fireCount when already fired', async () => {
      useFeedStore.setState({
        posts: [{ $id: 'p1', userId: 'u2', username: 'Sara', tier: 'rookie', runId: null, contestMonth: '2026-05', verified: true, fireCount: 6, firedBy: ['u1'], $createdAt: '' }],
      })
      db.updateDocument.mockResolvedValueOnce({ $id: 'p1', fireCount: 5, firedBy: [] } as any)

      const { result } = renderHook(() => useFeedStore())
      await act(async () => { await result.current.toggleFire('p1', 'u1') })

      expect(db.updateDocument).toHaveBeenCalledWith('trails-db', 'clip_posts', 'p1', {
        fireCount: 5,
        firedBy: [],
      })
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  cd "/Users/drixxen/Library/Mobile Documents/com~apple~CloudDocs/MoeMoeaTrails" && npx jest __tests__/stores/useFeedStore.test.ts --no-coverage 2>&1 | tail -10
  ```

  Expected: FAIL — "Cannot find module '@/stores/useFeedStore'"

- [ ] **Step 3: Create `stores/useFeedStore.ts`**

  ```ts
  import { create } from 'zustand'
  import { databases, DB_ID, CLIP_POSTS_ID, ID, Permission, Role, Query } from '@/lib/appwrite'
  import type { ClipPost, Tier } from '@/types'

  interface FeedState {
    posts: ClipPost[]
    getClipPosts: (contestMonth: string) => Promise<void>
    createClipPost: (data: {
      userId: string; username: string; tier: Tier
      runId: string | null; contestMonth: string; verified: boolean
    }) => Promise<ClipPost>
    toggleFire: (postId: string, userId: string) => Promise<void>
  }

  export const useFeedStore = create<FeedState>((set, get) => ({
    posts: [],

    getClipPosts: async (contestMonth) => {
      const res = await databases.listDocuments(DB_ID, CLIP_POSTS_ID, [
        Query.equal('contestMonth', contestMonth),
        Query.orderDesc('fireCount'),
        Query.limit(50),
      ])
      set({ posts: res.documents as unknown as ClipPost[] })
    },

    createClipPost: async (data) => {
      const doc = await databases.createDocument(
        DB_ID, CLIP_POSTS_ID, ID.unique(),
        { ...data, fireCount: 0, firedBy: [] },
        [Permission.read(Role.any()), Permission.write(Role.user(data.userId))]
      )
      const post = doc as unknown as ClipPost
      set(s => ({ posts: [post, ...s.posts] }))
      return post
    },

    toggleFire: async (postId, userId) => {
      const post = get().posts.find(p => p.$id === postId)
      if (!post) return

      const alreadyFired = post.firedBy.includes(userId)
      const newFiredBy  = alreadyFired ? post.firedBy.filter(id => id !== userId) : [...post.firedBy, userId]
      const newCount    = alreadyFired ? post.fireCount - 1 : post.fireCount + 1

      await databases.updateDocument(DB_ID, CLIP_POSTS_ID, postId, {
        fireCount: newCount,
        firedBy:   newFiredBy,
      })

      set(s => ({
        posts: s.posts.map(p => p.$id === postId ? { ...p, fireCount: newCount, firedBy: newFiredBy } : p),
      }))
    },
  }))
  ```

- [ ] **Step 4: Run tests**

  ```bash
  cd "/Users/drixxen/Library/Mobile Documents/com~apple~CloudDocs/MoeMoeaTrails" && npx jest __tests__/stores/useFeedStore.test.ts --no-coverage
  ```

  Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

  ```bash
  git add stores/useFeedStore.ts __tests__/stores/useFeedStore.test.ts
  git commit -m "feat: add useFeedStore with clip posts and fire toggle"
  ```

---

## Task 6: Wire Dashboard Screen

**Files:**
- Modify: `app/(app)/(tabs)/dashboard.tsx`

Replace the hardcoded `DAY_SESSIONS`, `WEEKLY_RANKING`, and `MY_BESTS` blocks with real data from `useRunStore`. The screen structure stays identical — only data sources change.

- [ ] **Step 1: Add store imports and loading state at top of file**

  Replace the entire `// ── MOCK DATA ────` block (lines 13–55) with:

  ```ts
  import { useEffect, useState } from 'react'
  import { useAuthStore } from '@/stores/useAuthStore'
  import { useRunStore } from '@/stores/useRunStore'
  import type { Run, Tier } from '@/types'

  // ── TYPES ────────────────────────────────────────────────────────────────────

  type DaySession = {
    label: string; date: string; runs: number
    bestRun: string; bestAirtime: string
    airtimeData: number[]; runTimeData: number[]
  }

  type WeeklyRankRow = {
    rank: number; name: string; time: string; delta: string; tier: Tier; isMe?: boolean
  }

  type PersonalBests = {
    gesamt: { time: string; airtime: string; speed: string; gforce: string; rank: string; rankOf: number }
    p1:     { time: string; airtime: string; speed: string; gforce: string; rank: string; rankOf: number }
    p2:     { time: string; airtime: string; speed: string; gforce: string; rank: string; rankOf: number }
  }

  function fmtTime(secs: number | null): string {
    if (secs == null) return '—'
    const m = Math.floor(secs / 60)
    const s = (secs % 60).toFixed(1).padStart(4, '0')
    return `${m}:${s}`
  }
  ```

- [ ] **Step 2: Replace `DashboardScreen` component body**

  Replace the `export default function DashboardScreen()` function with:

  ```tsx
  export default function DashboardScreen() {
    const { session } = useAuthStore()
    const { getSessionsWithRuns, getPersonalBests, getWeeklyStats, getWeeklyRanking, getLeaderboard } = useRunStore()

    const [daySessions, setDaySessions] = useState<DaySession[]>([])
    const [weeklyRanking, setWeeklyRanking] = useState<WeeklyRankRow[]>([])
    const [bests, setBests] = useState<PersonalBests | null>(null)
    const [weeklyGoals, setWeeklyGoals] = useState({ distance: 0, airtime: 0, topSpeed: 0 })
    const [tp, setTp] = useState(0)
    const tpMax = 4000

    const [expandedDay, setExpandedDay] = useState<number | null>(null)
    const [showAllSessions, setShowAllSessions] = useState(false)

    const userId = session?.userId

    useEffect(() => {
      if (!userId) return

      getSessionsWithRuns(userId).then((data) => {
        const mapped: DaySession[] = data.map(({ session: s, runs }) => ({
          label: new Date(s.date).toLocaleDateString('de', { day: '2-digit', month: '2-digit' }),
          date: s.date,
          runs: runs.length,
          bestRun: fmtTime(runs.length ? Math.min(...runs.map(r => r.totalTime)) : null),
          bestAirtime: runs.length ? `${Math.max(...runs.map(r => r.maxAirtime)).toFixed(1)}s` : '—',
          airtimeData: runs.map(r => r.maxAirtime),
          runTimeData: runs.map(r => r.totalTime),
        }))
        setDaySessions(mapped)
      })

      getPersonalBests(userId).then((pb) => {
        setBests({
          gesamt: { time: fmtTime(pb.totalTime), airtime: pb.maxAirtime?.toFixed(1) ?? '—', speed: pb.maxSpeed?.toFixed(0) ?? '—', gforce: pb.maxGForce?.toFixed(1) ?? '—', rank: '#—', rankOf: 0 },
          p1:     { time: fmtTime(pb.p1Time),    airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
          p2:     { time: fmtTime(pb.p2Time),    airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
        })
        setTp(Math.round((pb.maxAirtime ?? 0) * 100 + (pb.maxSpeed ?? 0) * 10))
      })

      getWeeklyStats(userId).then(setWeeklyGoals)

      getWeeklyRanking(userId).then((ranking) => {
        setWeeklyRanking(ranking.map(r => ({
          rank: r.rank, name: r.username, tier: r.tier,
          time: fmtTime(r.totalTime), delta: r.delta, isMe: r.isMe,
        })))
      })
    }, [userId])

    const visibleSessions = showAllSessions ? daySessions : daySessions.slice(0, SESSIONS_PREVIEW)
    const hasMore = daySessions.length > SESSIONS_PREVIEW
    const level = Math.floor(tp / 400) + 1
    const username = useProfileStore?.getState().profile?.username ?? '—'
  ```

  > Note: add `import { useProfileStore } from '@/stores/useProfileStore'` at top of file.

  Update the `WeeklyGoals` component signature to accept a `stats` prop (add before the component):

  ```ts
  function WeeklyGoals({ stats }: { stats: { distance: number; airtime: number; topSpeed: number } }) {
    const goals = [
      { label: 'Distanz',   cur: stats.distance / 1000, goal: 50,  suffix: 'km',   color: accent },
      { label: 'Airtime',   cur: stats.airtime,          goal: 30,  suffix: 's',    color: '#a78bfa' },
      { label: 'Top-Speed', cur: stats.topSpeed,         goal: 80,  suffix: 'km/h', color: '#fbbf24' },
    ]
    // ... rest of WeeklyGoals JSX unchanged
  ```

  In the `DashboardScreen` JSX, pass the state as prop:
  ```tsx
  <WeeklyGoals stats={weeklyGoals} />
  ```

  Update `SlideWeeklyRanking` to accept `ranking` prop:

  ```ts
  function SlideWeeklyRanking({ ranking }: { ranking: WeeklyRankRow[] }) {
    return (
      <View style={s.slide}>
        <Text style={s.slideEyebrow}>WOCHENRANKING — GESAMTZEIT</Text>
        {ranking.map((r) => (
          <View key={r.rank} style={[s.rankRow, r.isMe && { backgroundColor: `${accent}0d`, borderColor: `${accent}28` }]}>
            <Text style={s.rankNum}>#{r.rank}</Text>
            <TierDot tier={r.tier} />
            <Text style={[s.rankName, r.isMe && { fontFamily: Fonts.bodyBd }]} numberOfLines={1}>
              {r.name}{r.isMe ? ' ' : ''}
              {r.isMe && <Text style={{ color: accent, fontSize: 9 }}>ICH</Text>}
            </Text>
            <Text style={[s.rankTime, r.rank === 1 && { color: '#9333ea' }]}>{r.time}</Text>
            <Text style={[s.rankDelta, { color: r.delta === '—' ? '#9333ea' : '#dc2626' }]}>{r.delta}</Text>
          </View>
        ))}
      </View>
    )
  }
  ```

  In the Carousel slides array, pass `weeklyRanking` to the component:
  ```tsx
  <SlideWeeklyRanking key="ranking" ranking={weeklyRanking} />,
  ```

  Replace hardcoded `MY_BESTS` carousel slides to use `bests` state. If `bests` is null, pass `'—'` as default:

  ```tsx
  const b = bests ?? {
    gesamt: { time: '—', airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
    p1:     { time: '—', airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
    p2:     { time: '—', airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add "app/(app)/(tabs)/dashboard.tsx"
  git commit -m "feat: wire dashboard to useRunStore (sessions, personal bests, weekly stats)"
  ```

---

## Task 7: Wire Leaderboard Screen

**Files:**
- Modify: `app/(app)/(tabs)/leaderboard.tsx`

- [ ] **Step 1: Replace mock DATA with store calls**

  At the top of `LeaderboardScreen`, add:

  ```ts
  import { useRunStore } from '@/stores/useRunStore'
  import type { Tier } from '@/types'
  ```

  Replace the hardcoded `DATA` constant and the screen body:

  ```tsx
  export default function LeaderboardScreen() {
    const { getLeaderboard } = useRunStore()
    const [section, setSection] = useState<'gesamt' | 'p1' | 'p2'>('gesamt')
    const [metric,  setMetric]  = useState<'airtime' | 'gforce' | 'speed' | 'style'>('airtime')
    const [data, setData] = useState<Entry[]>([])

    useEffect(() => {
      const m = metric === 'style' ? 'time' : metric as 'airtime' | 'gforce' | 'speed'
      getLeaderboard(m, section, 10).then((entries) => {
        const UNITS = { airtime: 's', gforce: 'g', speed: 'km/h', style: 'pts', time: 's' }
        setData(entries.map(e => ({
          rank: e.rank,
          user: e.username,
          tier: e.tier as Tier,
          value: e.value.toFixed(metric === 'speed' ? 0 : 2),
          unit: UNITS[metric] ?? '',
          bike: '',
          team: '',
        })))
      })
    }, [section, metric])

    const top3 = data.slice(0, 3)
    const rest  = data.slice(3)
    // ... rest of JSX unchanged
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add "app/(app)/(tabs)/leaderboard.tsx"
  git commit -m "feat: wire leaderboard to useRunStore"
  ```

---

## Task 8: Wire Feed Screen

**Files:**
- Modify: `app/(app)/(tabs)/feed.tsx`

- [ ] **Step 1: Replace mock FEED_ITEMS with store**

  Add imports:

  ```ts
  import { useFeedStore } from '@/stores/useFeedStore'
  import { useAuthStore } from '@/stores/useAuthStore'
  ```

  Replace `FeedScreen`:

  ```tsx
  export default function FeedScreen() {
    const { posts, getClipPosts, toggleFire } = useFeedStore()
    const { session } = useAuthStore()
    const [uploadOpen, setUploadOpen] = useState(false)

    const contestMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    useEffect(() => {
      getClipPosts(contestMonth)
    }, [contestMonth])

    const toggle = (postId: string) => {
      if (session?.userId) toggleFire(postId, session.userId)
    }
  ```

  Update the feed list JSX to iterate over `posts` instead of `FEED_ITEMS`:

  ```tsx
  {posts.map((post) => {
    const fired = session?.userId ? post.firedBy.includes(session.userId) : false
    return (
      <View key={post.$id} style={s.feedCard}>
        <VideoPlaceholder />
        {post.verified
          ? <View style={[s.badge, { backgroundColor: `${accent}22`, borderColor: `${accent}77` }]}>
              <Text style={[s.badgeText, { color: accent }]}>QR VALID</Text>
            </View>
          : <View style={[s.badge, { backgroundColor: 'rgba(255,40,40,0.13)', borderColor: 'rgba(255,60,60,0.35)' }]}>
              <Text style={[s.badgeText, { color: 'rgba(255,80,80,0.9)' }]}>NICHT VALIDIERT</Text>
            </View>
        }
        <View style={s.feedMeta}>
          <PixelAvatar tier={post.tier as any} px={2} accentColor={accent} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Text style={s.feedUser}>{post.username}</Text>
              <TierDot tier={post.tier} />
            </View>
            <Text style={s.feedBike}>{new Date(post.$createdAt).toLocaleDateString('de')}</Text>
          </View>
          <TouchableOpacity
            style={[s.fireBtn, fired && { backgroundColor: 'rgba(255,107,0,0.14)', borderColor: '#ff6b00' }]}
            onPress={() => toggle(post.$id)}
          >
            <Text style={{ fontSize: 11 }}>{fired ? '🔥' : '🤍'}</Text>
            <Text style={[s.fireCount, { color: fired ? '#ff6b00' : Colors.muted }]}>{post.fireCount}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  })}
  ```

  Update contest header sub-text:
  ```tsx
  <Text style={s.contestSub}>MOE MOEA Trails · {posts.filter(p => p.verified).length} validierte Clips</Text>
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add "app/(app)/(tabs)/feed.tsx"
  git commit -m "feat: wire feed to useFeedStore"
  ```

---

## Task 9: Wire Strecke Screen

**Files:**
- Modify: `app/(app)/(tabs)/strecke.tsx`

The strecke screen shows per-sector times for each rider. These come from `runs.p1Time` and `runs.p2Time`.

- [ ] **Step 1: Add store import and loading state**

  Add at top:

  ```ts
  import { useEffect, useState } from 'react'
  import { useRunStore } from '@/stores/useRunStore'
  import type { LeaderboardEntry } from '@/stores/useRunStore'
  ```

  > Note: export `LeaderboardEntry` type from `useRunStore.ts` (add `export` keyword to the interface).

- [ ] **Step 2: Replace mock SECTORS riders with dynamic data**

  In `StreckeScreen`, add:

  ```ts
  const { getLeaderboard } = useRunStore()
  const [p1Riders, setP1Riders] = useState<typeof SECTORS[0]['riders']>([])
  const [p2Riders, setP2Riders] = useState<typeof SECTORS[0]['riders']>([])

  useEffect(() => {
    getLeaderboard('time', 'p1', 5).then(entries => {
      const leader = entries[0]?.value ?? 0
      setP1Riders(entries.map((e, i) => ({
        name: e.username,
        time: e.value.toFixed(1),
        delta: i === 0 ? '—' : `+${(e.value - leader).toFixed(1)}`,
        tier: e.tier,
        fastest: i === 0,
      })))
    })
    getLeaderboard('time', 'p2', 5).then(entries => {
      const leader = entries[0]?.value ?? 0
      setP2Riders(entries.map((e, i) => ({
        name: e.username,
        time: e.value.toFixed(1),
        delta: i === 0 ? '—' : `+${(e.value - leader).toFixed(1)}`,
        tier: e.tier,
        fastest: i === 0,
      })))
    })
  }, [])
  ```

  Update SECTORS to use dynamic riders by merging state into the static SECTORS config:

  ```ts
  const sectorsWithRiders = SECTORS.map(s => ({
    ...s,
    riders: s.id === 'P1' ? p1Riders : p2Riders,
  }))
  ```

  Replace all `SECTORS` references in the JSX with `sectorsWithRiders`.

- [ ] **Step 3: Commit**

  ```bash
  git add "app/(app)/(tabs)/strecke.tsx"
  git commit -m "feat: wire strecke screen to useRunStore sector leaderboards"
  ```

---

## Task 10: Run Full Test Suite

- [ ] **Step 1: Run all tests**

  ```bash
  cd "/Users/drixxen/Library/Mobile Documents/com~apple~CloudDocs/MoeMoeaTrails" && npx jest --no-coverage 2>&1 | tail -30
  ```

  Expected: All existing tests + new store tests PASS. If any existing tests fail due to type changes (e.g., `useProfileStore.test.ts` — `tier` missing from mock profile), update the mock objects to include `tier: 'rookie'`.

- [ ] **Step 2: Fix any type errors**

  ```bash
  cd "/Users/drixxen/Library/Mobile Documents/com~apple~CloudDocs/MoeMoeaTrails" && npx tsc --noEmit 2>&1 | head -40
  ```

  Fix any TypeScript errors (likely missing `tier` in existing mock objects in tests).

- [ ] **Step 3: Final commit**

  ```bash
  git add -A
  git commit -m "chore: fix type errors after Profile.tier addition"
  ```

---

## Scope Verification

| Spec requirement | Task |
|-----------------|------|
| `profiles` — add `tier` | Task 1 + Task 3 |
| `bike_configs` collection | Task 1 (already exists) |
| `sessions` collection | Task 1 + Task 4 |
| `runs` collection | Task 1 + Task 4 |
| `clip_posts` collection | Task 1 + Task 5 |
| No raw sensor data stored | Enforced by store interface — no raw data fields |
| `dataSource` field | Task 3 types + Task 4 createRun |
| Feed fires with dedup | Task 5 toggleFire |
| Leaderboard from runs | Task 4 getLeaderboard |
| Weekly goals from runs | Task 4 getWeeklyStats |
| Extensibility: trailId stub | Task 4 createSession hardcodes `moe-moea` |
